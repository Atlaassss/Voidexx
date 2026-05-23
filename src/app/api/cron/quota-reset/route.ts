import { NextResponse } from "next/server";
import { tryGetDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/quota-reset
 *
 * Vercel Cron job to reset free-tier (RECON) users' monthly autopsy quota.
 * Runs at the start of each month (configured in vercel.json).
 *
 * The existing `checkAndIncrementQuota()` does lazy self-healing per
 * request, but this cron provides a clean, auditable bulk reset so:
 *   - Users who don't log in for a month still get a fresh counter if
 *     they come back mid-month.
 *   - The admin stats dashboard shows accurate "current month" usage
 *     without stale carryover from users who haven't triggered a
 *     lazy reset yet.
 *
 * Security: Protected by CRON_SECRET header check. Vercel injects this
 * automatically for Vercel Cron. In dev/demo, the route accepts the
 * request without the secret so you can curl it manually.
 *
 * Idempotent: Running multiple times in the same month is harmless — it
 * just re-zeroes counters for users whose period is already current.
 */
export async function GET(req: Request) {
  // Auth: in production, CRON_SECRET MUST be set AND match.
  // We fail closed: if the secret is missing in production, we refuse
  // rather than allowing an unauthenticated call to wipe quotas for
  // every RECON user. Vercel sets the bearer token automatically.
  //
  // In dev, callers can omit the header so a developer can `curl`
  // the endpoint to test it without setting up the env var.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const expected = cronSecret ? `Bearer ${cronSecret}` : null;

  if (process.env.NODE_ENV === "production") {
    if (!cronSecret) {
      console.error("[cron/quota-reset] CRON_SECRET not configured; refusing.");
      return new Response("Cron secret not configured", { status: 503 });
    }
    if (authHeader !== expected) {
      return new Response("Unauthorized", { status: 401 });
    }
  } else if (cronSecret && authHeader && authHeader !== expected) {
    // Dev with secret set: validate when the caller bothers to send it.
    return new Response("Unauthorized", { status: 401 });
  }

  const db = tryGetDb();
  if (!db) {
    return NextResponse.json({
      ok: true,
      demo: true,
      message: "No DB configured. Quota reset is a no-op in demo mode.",
    });
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Reset all RECON users whose freeUsagePeriodStart is before this month.
  // This means their counter belongs to a previous billing period.
  const result = await db.user.updateMany({
    where: {
      plan: "RECON",
      freeUsagePeriodStart: { lt: periodStart },
    },
    data: {
      freeUsageMonth: 0,
      freeUsagePeriodStart: periodStart,
    },
  });

  return NextResponse.json({
    ok: true,
    resetCount: result.count,
    periodStart: periodStart.toISOString(),
    executedAt: now.toISOString(),
  });
}
