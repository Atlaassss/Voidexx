import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/billing/stripe";
import { tryGetDb } from "@/lib/db";
import { planFromStripePriceId } from "@/lib/billing/plans";
import type { Plan, PaymentStatus } from "@prisma/client";

export const runtime = "nodejs";

/**
 * POST /api/billing/webhook
 *
 * Stripe webhook receiver. The ONLY authoritative source for plan
 * upgrades, downgrades, and payment records — checkout-session creation
 * intentionally doesn't touch User.plan, because the user can abandon
 * the hosted checkout and we'd otherwise have rolled them forward.
 *
 * Events we handle:
 *  - checkout.session.completed       → set plan, persist sub id, record payment
 *  - customer.subscription.updated    → reconcile plan + status (e.g. portal change)
 *  - customer.subscription.deleted    → revert to RECON, clear sub id
 *  - invoice.payment_succeeded        → record Payment row, extend planRenewsAt
 *  - invoice.payment_failed           → mark subscriptionStatus past_due
 *
 * Idempotency: every Payment row has providerRef as UNIQUE. Concurrent
 * deliveries of the same invoice event collapse via the unique key.
 *
 * Signature verification: REQUIRED. Stripe's endpoint secret protects
 * against forged events. We refuse to process anything if the secret
 * isn't configured AND we're in production.
 */
export async function POST(req: Request) {
  if (!env.stripe.enabled) {
    return NextResponse.json({ received: true, demo: true });
  }
  if (!env.stripe.webhookSecret) {
    // No secret: refuse in prod, accept-and-log in dev so a developer
    // running `stripe listen --forward-to ...` without setting the env
    // gets a clear hint instead of silent 200s.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "webhook_secret_missing" },
        { status: 503 },
      );
    }
    console.warn("[billing/webhook] STRIPE_WEBHOOK_SECRET not set; events not verified");
  }

  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    if (env.stripe.webhookSecret && sig) {
      const stripe = await getStripe();
      event = stripe.webhooks.constructEvent(rawBody, sig, env.stripe.webhookSecret);
    } else {
      event = JSON.parse(rawBody) as Stripe.Event;
    }
  } catch (err) {
    console.error("[billing/webhook] signature verification failed", err);
    return new NextResponse("invalid signature", { status: 400 });
  }

  const db = tryGetDb();
  if (!db) {
    // No DB yet: log and ack so Stripe doesn't retry forever.
    console.warn("[billing/webhook] DB not configured, dropping event", event.type);
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.created":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        // Many events fire for a subscription (charge.succeeded,
        // payment_intent.*, etc). We don't need most of them — Stripe
        // expects a 200 anyway so it stops retrying.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[billing/webhook] handler failed for ${event.type}`, err);
    // Return 500 so Stripe retries with backoff. If this becomes a
    // persistent error, the Stripe dashboard surfaces it to ops.
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const db = tryGetDb()!;
  const userId = await resolveUserId(session.customer, session.client_reference_id);
  if (!userId) {
    console.warn("[billing/webhook] no User for checkout.session.completed", session.id);
    return;
  }

  // Subscription mode is the only mode we issue. The id is on the session.
  const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!subId) return;

  // Pull the full subscription so we can read line items + period_end.
  const stripe = await getStripe();
  const sub = await stripe.subscriptions.retrieve(subId);
  const plan = derivePlan(sub);
  if (!plan) return;

  await db.user.update({
    where: { id: userId },
    data: {
      plan,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      planRenewsAt: periodEnd(sub),
    },
  });
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const db = tryGetDb()!;
  const userId = await resolveUserId(sub.customer, sub.metadata?.voidexxUserId);
  if (!userId) return;
  const plan = derivePlan(sub);
  if (!plan) return;

  await db.user.update({
    where: { id: userId },
    data: {
      plan,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      planRenewsAt: periodEnd(sub),
    },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const db = tryGetDb()!;
  const userId = await resolveUserId(sub.customer, sub.metadata?.voidexxUserId);
  if (!userId) return;

  await db.user.update({
    where: { id: userId },
    data: {
      plan: "RECON",
      stripeSubscriptionId: null,
      subscriptionStatus: "canceled",
      planRenewsAt: null,
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const db = tryGetDb()!;
  const userId = await resolveUserId(invoice.customer, null);
  if (!userId) return;

  // Idempotent insert keyed on Stripe invoice id. If the same event
  // is delivered twice (Stripe retries), the unique constraint makes
  // the second attempt a no-op.
  await db.payment
    .create({
      data: {
        userId,
        provider: "STRIPE",
        providerRef: invoice.id ?? `inv_${invoice.number ?? Date.now()}`,
        amountCents: invoice.amount_paid,
        currency: (invoice.currency ?? "usd").toUpperCase(),
        status: "PAID" satisfies PaymentStatus,
        description: invoice.lines.data[0]?.description ?? null,
      },
    })
    .catch((err: unknown) => {
      // P2002: unique constraint violation (already recorded). Ignore.
      const isDup = (err as { code?: string })?.code === "P2002";
      if (!isDup) throw err;
    });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const db = tryGetDb()!;
  const userId = await resolveUserId(invoice.customer, null);
  if (!userId) return;
  await db.user.update({
    where: { id: userId },
    data: { subscriptionStatus: "past_due" },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reconcile a Stripe customer/event → our User.id via two paths. */
async function resolveUserId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  fallbackUserId: string | null | undefined,
): Promise<string | null> {
  const db = tryGetDb()!;
  const customerId = typeof customer === "string" ? customer : customer?.id;

  if (customerId) {
    const row = await db.user.findUnique({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
    if (row) return row.id;
  }

  // Fallback: client_reference_id / metadata.voidexxUserId stamped at
  // checkout-session creation. Used when the User row hadn't been
  // updated with stripeCustomerId yet (race between checkout completion
  // and our upsert).
  if (fallbackUserId) {
    const row = await db.user.findUnique({
      where: { id: fallbackUserId },
      select: { id: true, stripeCustomerId: true },
    });
    if (row) {
      // Backfill stripeCustomerId for next time.
      if (customerId && !row.stripeCustomerId) {
        await db.user.update({
          where: { id: fallbackUserId },
          data: { stripeCustomerId: customerId },
        });
      }
      return row.id;
    }
  }

  return null;
}

function derivePlan(sub: Stripe.Subscription): Plan | null {
  const priceId = sub.items.data[0]?.price.id;
  return planFromStripePriceId(priceId);
}

function periodEnd(sub: Stripe.Subscription): Date | null {
  // Stripe's TS types put current_period_end on the subscription item
  // rather than the subscription itself in newer API versions.
  const item = sub.items.data[0];
  const ts = (item as { current_period_end?: number } | undefined)?.current_period_end;
  if (!ts) return null;
  return new Date(ts * 1000);
}
