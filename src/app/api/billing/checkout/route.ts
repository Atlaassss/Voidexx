import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, asResponse, ensureDbUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/billing/stripe";
import { PLANS, isPurchasable } from "@/lib/billing/plans";
import { getOrCreateStripeCustomer } from "@/lib/billing/customer";
import type { Plan } from "@prisma/client";

export const runtime = "nodejs";

const CheckoutSchema = z.object({
  plan: z.enum(["OPERATOR", "DESK"]),
});

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout session for the requested paid plan and
 * returns the hosted-checkout URL. The client redirects the browser
 * to that URL; on success Stripe redirects back to
 *   /dashboard/billing?checkout=success
 * On cancel:
 *   /dashboard/billing?checkout=cancelled
 *
 * The actual plan upgrade does NOT happen here — it happens when the
 * Stripe webhook fires `checkout.session.completed`. This is the
 * correct place to do it: the webhook is the only authoritative source
 * of truth about whether payment cleared.
 *
 * Demo mode (no STRIPE_SECRET_KEY): returns 503 with a hint message.
 */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    const r = asResponse(err);
    return r ?? new Response("Unauthorized", { status: 401 });
  }

  if (!env.stripe.enabled) {
    return NextResponse.json(
      {
        error: "billing_not_configured",
        message:
          "Stripe is not configured in this environment. Set STRIPE_SECRET_KEY + STRIPE_PRICE_OPERATOR + STRIPE_PRICE_DESK to enable checkout.",
        demo: true,
      },
      { status: 503 },
    );
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

  const targetPlan: Plan = parsed.data.plan;
  if (!isPurchasable(targetPlan)) {
    return NextResponse.json(
      {
        error: "price_not_configured",
        message: `Stripe price id missing for plan ${targetPlan}. Set STRIPE_PRICE_${targetPlan}.`,
      },
      { status: 503 },
    );
  }

  // Mirror the Clerk identity into Postgres before any FK-bearing write.
  // Required so getOrCreateStripeCustomer can persist stripeCustomerId.
  await ensureDbUser(user);

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
        // Stripe Tax handles VAT/GST automatically when enabled in the
        // dashboard. Safe default — does nothing if Tax is off.
        automatic_tax: { enabled: true },
        // Allow the user to enter a promo code at checkout. The discount
        // flows through to the subscription automatically.
        allow_promotion_codes: true,
        // Stamp our user id on both the session AND the subscription so
        // every webhook event can reconcile back to a User row even if
        // stripeCustomerId hasn't propagated yet.
        client_reference_id: user.id,
        subscription_data: {
          metadata: {
            voidexxUserId: user.id,
            voidexxPlan: targetPlan,
          },
        },
      },
      {
        // Idempotency on the BROWSER side: same user clicking Upgrade
        // twice within 15 min returns the same session URL. Hash includes
        // plan so OPERATOR vs DESK don't collide.
        idempotencyKey: `checkout:${user.id}:${targetPlan}:${Math.floor(Date.now() / (15 * 60 * 1000))}`,
      },
    );

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error("[billing/checkout] failed", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
