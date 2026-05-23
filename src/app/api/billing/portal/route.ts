import { NextResponse } from "next/server";
import { requireUser, asResponse, ensureDbUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/billing/stripe";
import { getOrCreateStripeCustomer } from "@/lib/billing/customer";

export const runtime = "nodejs";

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session and returns its URL.
 * The portal lets users:
 *  - update payment method
 *  - download invoices
 *  - upgrade / downgrade between Operator and Desk
 *  - cancel subscription
 *
 * Stripe handles all of the above; we receive the resulting state via
 * webhook (`customer.subscription.updated`, `customer.subscription.deleted`).
 *
 * Demo mode: returns 503.
 */
export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    const r = asResponse(err);
    return r ?? new Response("Unauthorized", { status: 401 });
  }

  if (!env.stripe.enabled) {
    return NextResponse.json(
      { error: "billing_not_configured", demo: true },
      { status: 503 },
    );
  }

  try {
    await ensureDbUser(user);
    const stripe = await getStripe();
    const customerId = await getOrCreateStripeCustomer(user);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: env.stripe.portalReturnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing/portal] failed", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
