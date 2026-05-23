import { NextResponse } from "next/server";
import { tryGetDb } from "@/lib/db";
import { env } from "@/lib/env";
import { getPaymentIntent } from "@/lib/billing/paymongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/payment-expiry
 *
 * Sweep stale PayMongo PaymentIntents off `User.paymongoIntentId`.
 *
 * Why this exists:
 *   - PayMongo intents auto-expire on their side after ~1 hour of being
 *     `awaiting_payment_method` or `awaiting_next_action`.
 *   - We persist the intent id on the User row so a re-click of "Pay
 *     with GCash" within that 1-hour window doesn't create a second
 *     orphaned intent. But if the user abandons the redirect, we'd
 *     refuse to issue a fresh intent forever without a sweep.
 *   - Webhooks would clear the field on success/failure, but the
 *     "user closed the tab and never came back" case fires no webhook
 *     — that's exactly what this cron handles.
 *
 * What it does:
 *   1. Find Users with paymongoIntentId set AND paymongoIntentExpires < now()
 *   2. For each, fetch the intent from PayMongo to see its terminal state
 *   3. If the intent is `cancelled` / `awaiting_*` / has expired → null both fields
 *   4. If the intent is `succeeded` / `processing` → leave alone (webhook
 *      should handle; logging this case so we can investigate stuck-flow bugs)
 *
 * Security: Same `CRON_SECRET` bearer pattern as quota-reset. Vercel
 * injects the header automatically for Vercel Cron jobs.
 *
 * Schedule: Hourly (configured in vercel.json). The 1-hour cycle
 * matches PayMongo's own expiry window so a user's "abandoned" intent
 * is never stale for more than ~1 hour after PayMongo gives up on it.
 *
 * Demo mode: when paymongo is unwired OR DB is unwired, returns ok with
 * `demo: true` so the same endpoint can be hit during preview deploys
 * without crashing.
 */
export async function GET(req: Request) {
  // Auth — same pattern as /api/cron/quota-reset.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const expected = cronSecret ? `Bearer ${cronSecret}` : null;
  if (process.env.NODE_ENV === "production") {
    if (!cronSecret) {
      console.error("[cron/payment-expiry] CRON_SECRET not configured; refusing.");
      return new Response("Cron secret not configured", { status: 503 });
    }
    if (authHeader !== expected) {
      return new Response("Unauthorized", { status: 401 });
    }
  } else if (cronSecret && authHeader && authHeader !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Demo short-circuits.
  if (!env.paymongo.enabled) {
    return NextResponse.json({
      ok: true,
      demo: true,
      message: "PayMongo not configured; nothing to sweep.",
    });
  }
  const db = tryGetDb();
  if (!db) {
    return NextResponse.json({
      ok: true,
      demo: true,
      message: "DB not configured; nothing to sweep.",
    });
  }

  const now = new Date();
  // Pull users with stale intents. Cap at 200 per run — at our expected
  // scale this should finish in well under a second; the cap protects
  // us if something goes wrong upstream and a thousand intents pile up.
  const stale = await db.user.findMany({
    where: {
      paymongoIntentId: { not: null },
      paymongoIntentExpires: { lt: now },
    },
    select: { id: true, paymongoIntentId: true },
    take: 200,
  });

  let cleared = 0;
  let stillActive = 0;
  let probeFailures = 0;

  for (const u of stale) {
    if (!u.paymongoIntentId) continue;
    try {
      const intent = await getPaymentIntent(u.paymongoIntentId);
      // Terminal-not-success states → safe to clear.
      const isTerminal =
        intent.status === "cancelled" ||
        intent.status === "awaiting_payment_method" ||
        intent.status === "awaiting_next_action";

      if (isTerminal) {
        await db.user.update({
          where: { id: u.id },
          data: { paymongoIntentId: null, paymongoIntentExpires: null },
        });
        cleared++;
      } else {
        // succeeded / processing → webhook should handle. Log so we can
        // alert if this is non-zero (would suggest webhook delivery issues).
        stillActive++;
        console.warn(
          `[cron/payment-expiry] intent ${u.paymongoIntentId} (user ${u.id}) is ${intent.status} but past expiry — webhook may have missed.`,
        );
      }
    } catch (err) {
      // 404 from PayMongo (intent fully dropped on their side) → also clear.
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        await db.user.update({
          where: { id: u.id },
          data: { paymongoIntentId: null, paymongoIntentExpires: null },
        });
        cleared++;
      } else {
        probeFailures++;
        console.error("[cron/payment-expiry] probe failed", {
          userId: u.id,
          intentId: u.paymongoIntentId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: stale.length,
    cleared,
    stillActive,
    probeFailures,
    executedAt: now.toISOString(),
  });
}
