import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { tryGetDb } from "@/lib/db";
import {
  verifyWebhookSignature,
  getPaymentIntent,
  type PaymongoEvent,
} from "@/lib/billing/paymongo";
import { planFromPaymongoMetadata, PLANS } from "@/lib/billing/plans";
import { claimWebhookEvent } from "@/lib/webhook-idempotency";
import type { Plan, PaymentStatus } from "@prisma/client";

export const runtime = "nodejs";

/**
 * POST /api/billing/paymongo/webhook
 *
 * PayMongo webhook receiver. Authoritative for plan upgrades, payment
 * records, and failures on the Philippine rail. The /api/billing/checkout
 * (provider=paymongo) flow stamps `voidexxUserId` + `voidexxPlan` on the
 * PaymentIntent metadata so we can reconcile here without round-tripping.
 *
 * Events we handle:
 *   - payment.paid                          → primary upgrade event
 *   - payment_intent.succeeded              → backup upgrade event
 *   - payment.failed                        → mark failed payment
 *   - payment_intent.payment_failed         → log + leave intent stale
 *   - source.chargeable                     → ignored (legacy Sources API)
 *
 * Idempotency: WebhookEvent table + Payment.providerRef UNIQUE.
 *
 * Signature verification: REQUIRED in production. In dev, missing
 * webhook secret falls through with a warning so a developer running
 * `paymongo-cli forward` without setting the env still sees events.
 */
export async function POST(req: Request) {
  if (!env.paymongo.enabled) {
    return NextResponse.json({ received: true, demo: true });
  }
  if (!env.paymongo.webhookSecret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "webhook_secret_missing" },
        { status: 503 },
      );
    }
    console.warn("[billing/paymongo/webhook] PAYMONGO_WEBHOOK_SECRET not set; events not verified");
  }

  const sig = req.headers.get("paymongo-signature");
  const rawBody = await req.text();

  // Verify signature when secret is configured. In dev w/o secret we
  // skip verification so local testing works.
  if (env.paymongo.webhookSecret) {
    const ok = verifyWebhookSignature({ signatureHeader: sig, rawBody });
    if (!ok) {
      console.error("[billing/paymongo/webhook] signature verification failed");
      return new NextResponse("invalid signature", { status: 400 });
    }
  }

  let event: PaymongoEvent;
  try {
    event = JSON.parse(rawBody) as PaymongoEvent;
  } catch (err) {
    console.error("[billing/paymongo/webhook] invalid json", err);
    return new NextResponse("invalid body", { status: 400 });
  }

  const db = tryGetDb();
  if (!db) {
    console.warn("[billing/paymongo/webhook] DB not configured, dropping", event.type);
    return NextResponse.json({ received: true });
  }

  // Idempotency claim — same event can deliver multiple times.
  const claim = await claimWebhookEvent("paymongo", event.id, event.type, null);
  if (claim.duplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "payment.paid":
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event);
        break;
      case "payment.failed":
      case "payment_intent.payment_failed":
        await handlePaymentFailed(event);
        break;
      default:
        // Other events (source.chargeable, checkout_session.*) — ack
        // without processing so PayMongo stops retrying.
        break;
    }
    await claim.markDone();
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[billing/paymongo/webhook] handler failed for ${event.type}`, err);
    await claim.markFailed(err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

interface PaymentEventInner {
  id: string;
  attributes: {
    amount: number;
    currency: string;
    description: string | null;
    status: string;
    payment_intent_id?: string;
    source?: { type?: string };
    metadata?: Record<string, string>;
  };
}

async function handlePaymentSucceeded(event: PaymongoEvent) {
  const db = tryGetDb()!;

  // Reconcile back to our user. Two paths:
  //   1. metadata.voidexxUserId on the *intent* (preferred)
  //   2. paymongoIntentId on the User (fallback for events where
  //      metadata is on the payment object instead).
  const inner = event.data?.attributes?.data as unknown as PaymentEventInner;
  const intentId = inner.attributes.payment_intent_id ?? inner.id;

  // Re-fetch the intent because the webhook payload doesn't always
  // include the metadata we stamped (PayMongo varies by event type).
  // The cost is one extra API call per upgrade — fine for the volume.
  let intentMetadata: Record<string, string> | null = null;
  let intentDescription: string | null = null;
  try {
    const intent = await getPaymentIntent(intentId);
    intentMetadata = intent.metadata;
    intentDescription = intent.payments?.[0]?.description ?? null;
  } catch (err) {
    console.error("[billing/paymongo/webhook] re-fetch intent failed", err);
    // Don't bail — the User row's paymongoIntentId fallback may still work.
  }

  const userIdFromMeta = intentMetadata?.voidexxUserId ?? null;
  const planFromMeta = planFromPaymongoMetadata(intentMetadata);

  const user = userIdFromMeta
    ? await db.user.findUnique({
        where: { id: userIdFromMeta },
        select: { id: true, paymongoIntentId: true, email: true, displayName: true, username: true },
      })
    : await db.user.findUnique({
        where: { paymongoIntentId: intentId },
        select: { id: true, paymongoIntentId: true, email: true, displayName: true, username: true },
      });

  if (!user) {
    console.warn("[billing/paymongo/webhook] no User for intent", intentId);
    return;
  }

  // Determine plan. Prefer metadata; fall back to amount-matching.
  let plan: Plan | null = planFromMeta;
  if (!plan) {
    const amount = inner.attributes.amount;
    plan = planFromAmount(amount);
  }
  if (!plan) {
    console.warn("[billing/paymongo/webhook] cannot derive plan", { intentId });
    return;
  }

  // Flip the plan and clear the active intent. PayMongo subscriptions
  // are NOT recurring (PayMongo doesn't have native subscriptions yet);
  // we set planRenewsAt to +30d as a soft target. The next billing
  // cycle will be a fresh checkout — Phase 7.2 wires reminders.
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      plan,
      paymongoIntentId: null,
      paymongoIntentExpires: null,
      subscriptionStatus: "active",
      planRenewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    select: {
      email: true,
      displayName: true,
      username: true,
      plan: true,
      subscriptionStatus: true,
    },
  });

  // Persist the Payment row. providerRef UNIQUE collapses duplicate deliveries.
  await db.payment
    .create({
      data: {
        userId: user.id,
        provider: "PAYMONGO",
        providerRef: inner.id,
        amountCents: inner.attributes.amount,
        currency: (inner.attributes.currency ?? "PHP").toUpperCase(),
        status: "PAID" satisfies PaymentStatus,
        description:
          inner.attributes.description ??
          intentDescription ??
          `PayMongo · ${inner.attributes.source?.type ?? "card"}`,
      },
    })
    .catch((err: unknown) => {
      const isDup = (err as { code?: string })?.code === "P2002";
      if (!isDup) throw err;
    });

  // Side effects.
  await notifyPlanChanged(updated);
  await rewardReferrerIfPending(user.id);
}

async function handlePaymentFailed(event: PaymongoEvent) {
  const db = tryGetDb()!;
  const inner = event.data?.attributes?.data as unknown as PaymentEventInner;
  const intentId = inner.attributes.payment_intent_id ?? inner.id;

  // Best-effort user lookup via paymongoIntentId. We don't update the
  // user's plan here — they were never upgraded. We just record the
  // failed payment for auditability.
  const user = await db.user.findUnique({
    where: { paymongoIntentId: intentId },
    select: { id: true },
  });
  if (!user) return;

  await db.payment
    .create({
      data: {
        userId: user.id,
        provider: "PAYMONGO",
        providerRef: inner.id,
        amountCents: inner.attributes.amount,
        currency: (inner.attributes.currency ?? "PHP").toUpperCase(),
        status: "FAILED" satisfies PaymentStatus,
        description: inner.attributes.description ?? "PayMongo · failed",
      },
    })
    .catch((err: unknown) => {
      const isDup = (err as { code?: string })?.code === "P2002";
      if (!isDup) throw err;
    });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fallback plan resolution from a paid amount in centavos. Matches
 * within ±5% to allow for FX wobble and PayMongo's 2.5% surcharge on
 * some methods.
 */
function planFromAmount(centavos: number): Plan | null {
  for (const plan of ["OPERATOR", "DESK"] as const) {
    const target = PLANS[plan].paymongoCentavos;
    if (!target) continue;
    if (Math.abs(centavos - target) / target < 0.05) return plan;
  }
  return null;
}

async function notifyPlanChanged(user: {
  email: string | null;
  displayName: string | null;
  username: string | null;
  plan: string;
  subscriptionStatus: string | null;
}): Promise<void> {
  if (!user.email) return;
  try {
    const { sendPlanChangedEmail } = await import("@/lib/email");
    await sendPlanChangedEmail({
      to: user.email,
      displayName: user.displayName ?? user.username ?? null,
      newPlan: user.plan,
      status: user.subscriptionStatus,
    });
  } catch (err) {
    console.error("[billing/paymongo/webhook] plan-changed email failed", err);
  }
}

async function rewardReferrerIfPending(userId: string): Promise<void> {
  try {
    const { markRefereeConverted } = await import("@/lib/referrals");
    await markRefereeConverted(userId);
  } catch (err) {
    console.error("[billing/paymongo/webhook] reward-referrer failed", err);
  }
}
