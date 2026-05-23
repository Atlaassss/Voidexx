import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, asResponse, ensureDbUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/billing/stripe";
import { PLANS, isPurchasable, isPurchasableViaPaymongo } from "@/lib/billing/plans";
import { getOrCreateStripeCustomer } from "@/lib/billing/customer";
import {
  createPaymentIntent,
  createEwalletPaymentMethod,
  attachPaymentMethod,
} from "@/lib/billing/paymongo";
import { tryGetDb } from "@/lib/db";
import type { Plan } from "@prisma/client";

export const runtime = "nodejs";

/**
 * Body schema. The `provider` field selects the rail; the optional
 * `method` field is required when provider=paymongo and selects the
 * specific Philippine method (gcash / paymaya / grab_pay / dob /
 * dob_ubp / billease). Cards (visa/mc/jcb/amex) flow through the
 * "card" method but require a tokenised card from the PayMongo.js
 * client SDK we don't yet ship — Phase 7.2.
 */
const CheckoutSchema = z.object({
  plan: z.enum(["OPERATOR", "DESK"]),
  provider: z.enum(["stripe", "paymongo"]).default("stripe"),
  method: z
    .enum(["gcash", "paymaya", "grab_pay", "dob", "dob_ubp", "billease"])
    .optional(),
});

/**
 * POST /api/billing/checkout
 *
 * Branches on `provider`:
 *
 *   - "stripe"   → existing Stripe Checkout flow (Phase 4)
 *   - "paymongo" → Phase 7.1 redirect-method flow:
 *                  1. create PaymentIntent (PHP-denominated)
 *                  2. create PaymentMethod for the chosen ewallet
 *                  3. attach → returns next_action.redirect.url
 *                  4. respond { url } — client window.location.href = url
 *                  5. user authorises → return_url + webhook fires
 *
 * Demo mode: when neither rail is configured, returns 503. When ONLY
 * the requested rail is unconfigured but the other is, returns a
 * helpful "use the other provider" hint.
 */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    const r = asResponse(err);
    return r ?? new Response("Unauthorized", { status: 401 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = CheckoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "bad_request",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const { plan: targetPlan, provider, method } = parsed.data;

  // Both rails 503 → can't take payment in any flavour.
  if (!env.stripe.enabled && !env.paymongo.enabled) {
    return NextResponse.json(
      {
        error: "billing_not_configured",
        message:
          "No payment rail configured. Set STRIPE_SECRET_KEY (global) or PAYMONGO_SECRET_KEY (Philippines) to enable checkout.",
        demo: true,
      },
      { status: 503 },
    );
  }

  // Mirror the Clerk identity into Postgres before any FK-bearing write.
  await ensureDbUser(user);

  if (provider === "paymongo") {
    return handlePaymongoCheckout(user, targetPlan, method);
  }
  return handleStripeCheckout(user, targetPlan);
}

// ---------------------------------------------------------------------------
// Stripe path (unchanged from Phase 4)
// ---------------------------------------------------------------------------

async function handleStripeCheckout(user: Awaited<ReturnType<typeof requireUser>>, targetPlan: Plan) {
  if (!env.stripe.enabled) {
    return NextResponse.json(
      {
        error: "stripe_not_configured",
        message: env.paymongo.enabled
          ? "Stripe is unavailable. Use provider=\"paymongo\" with a Philippine method instead."
          : "Stripe is not configured. Set STRIPE_SECRET_KEY.",
        demo: true,
      },
      { status: 503 },
    );
  }

  if (!isPurchasable(targetPlan)) {
    return NextResponse.json(
      {
        error: "price_not_configured",
        message: `Stripe price id missing for plan ${targetPlan}. Set STRIPE_PRICE_${targetPlan}.`,
      },
      { status: 503 },
    );
  }

  try {
    const stripe = await getStripe();
    const customerId = await getOrCreateStripeCustomer(user);
    const priceId = PLANS[targetPlan].stripePriceId!;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: env.stripe.successUrl,
        cancel_url: env.stripe.cancelUrl,
        automatic_tax: { enabled: true },
        allow_promotion_codes: true,
        client_reference_id: user.id,
        subscription_data: {
          metadata: {
            voidexxUserId: user.id,
            voidexxPlan: targetPlan,
          },
        },
      },
      {
        idempotencyKey: `checkout:${user.id}:${targetPlan}:${Math.floor(Date.now() / (15 * 60 * 1000))}`,
      },
    );

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      provider: "stripe",
    });
  } catch (err) {
    console.error("[billing/checkout/stripe] failed", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PayMongo path (Phase 7.1)
// ---------------------------------------------------------------------------

type PaymongoEwalletMethod = "gcash" | "paymaya" | "grab_pay" | "dob" | "dob_ubp" | "billease";

async function handlePaymongoCheckout(
  user: Awaited<ReturnType<typeof requireUser>>,
  targetPlan: Plan,
  method: PaymongoEwalletMethod | undefined,
) {
  if (!env.paymongo.enabled) {
    return NextResponse.json(
      {
        error: "paymongo_not_configured",
        message: env.stripe.enabled
          ? "PayMongo is unavailable. Use provider=\"stripe\" instead, or set PAYMONGO_SECRET_KEY to enable Philippine methods."
          : "PayMongo is not configured. Set PAYMONGO_SECRET_KEY.",
        demo: true,
      },
      { status: 503 },
    );
  }

  if (!isPurchasableViaPaymongo(targetPlan)) {
    return NextResponse.json(
      {
        error: "price_not_configured",
        message: `PayMongo price missing for plan ${targetPlan}. Set PAYMONGO_PRICE_${targetPlan}_PHP (in centavos), or rely on the USD→PHP fallback in PLANS.`,
      },
      { status: 503 },
    );
  }

  // For now we require the user to choose a redirect method up-front.
  // A future iteration could create the intent first and let the user
  // pick a method via the PayMongo.js client widget — but that's a
  // larger UX change.
  if (!method) {
    return NextResponse.json(
      {
        error: "method_required",
        message:
          "Pick a Philippine payment method: gcash, paymaya, grab_pay, dob, dob_ubp, or billease.",
      },
      { status: 400 },
    );
  }

  const planDef = PLANS[targetPlan];
  const amount = planDef.paymongoCentavos!;

  try {
    // Step 1 — PaymentIntent. We allow the chosen method PLUS card so
    // PayMongo's hosted page can offer a card fallback if the ewallet
    // app isn't installed on the user's device.
    const intent = await createPaymentIntent({
      amount,
      currency: "PHP",
      description: `Voidexx ${planDef.name} · ${targetPlan}`,
      paymentMethodAllowed: [method, "card"],
      metadata: {
        voidexxUserId: user.id,
        voidexxPlan: targetPlan,
        // Stamp the rail so /api/billing/paymongo/webhook can early-out
        // if it ever sees an event for an intent created elsewhere.
        voidexxRail: "paymongo",
      },
    });

    // Step 2 — PaymentMethod for the ewallet/redirect choice.
    const billingName = user.displayName ?? user.username ?? "Voidexx user";
    const billingEmail = user.email ?? `user+${user.id}@no-email.voidexx.local`;
    const pm = await createEwalletPaymentMethod({
      type: method,
      billing: { name: billingName, email: billingEmail },
    });

    // Step 3 — attach → returns next_action.redirect.url
    const attached = await attachPaymentMethod({
      intentId: intent.id,
      methodId: pm.id,
      clientKey: intent.client_key,
      returnUrl: env.paymongo.successUrl,
    });

    const redirectUrl = attached.next_action?.redirect?.url;
    if (!redirectUrl) {
      console.error("[billing/checkout/paymongo] no redirect url after attach", {
        intentId: intent.id,
        status: attached.status,
      });
      return NextResponse.json(
        {
          error: "no_redirect",
          message: "PayMongo did not return a redirect URL. Try a different method.",
        },
        { status: 502 },
      );
    }

    // Step 4 — persist the intent on the user so the cron sweep can
    // expire it if the user abandons the redirect. We deliberately
    // store this even before the webhook lands; the webhook is the
    // authoritative upgrade event but having the id locally lets us
    // (a) refuse to issue a NEW intent within the 1-hour window and
    // (b) clean up zombies.
    const db = tryGetDb();
    if (db) {
      await db.user.update({
        where: { id: user.id },
        data: {
          paymongoIntentId: intent.id,
          // PayMongo intents auto-expire after 1 hour of being awaiting_*.
          paymongoIntentExpires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
    }

    return NextResponse.json({
      url: redirectUrl,
      intentId: intent.id,
      provider: "paymongo",
      method,
      // Surface the amount so the client can show "₱1,344 via GCash"
      // before navigating, reducing surprise on the redirect.
      amount,
      currency: "PHP",
    });
  } catch (err) {
    console.error("[billing/checkout/paymongo] failed", err);
    return NextResponse.json(
      {
        error: "paymongo_failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 502 },
    );
  }
}
