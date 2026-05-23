/**
 * Free-tier quota check for AI autopsies.
 *
 * Real impl reads/writes `User.freeUsageMonth` in Postgres. Resets are
 * lazy: each call compares the current month against the stored
 * `User.freeUsagePeriodStart` and zeroes the counter atomically when
 * we've crossed into a new month. No external cron required.
 *
 * In demo mode (no DB) the gate is a no-op — always allow.
 *
 * RACE-FREE: every state change is a single conditional `updateMany`
 * statement. Two concurrent requests near the cap can't both pass and
 * both increment; two concurrent requests at month-boundary can't both
 * reset and double-reset.
 */

import { env } from "./env";
import { getDb } from "./db";

const FREE_MONTHLY = 5;

export interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  plan: "RECON" | "OPERATOR" | "DESK";
}

/** First-of-this-month at 00:00 local server time. UTC is fine here — the
 *  exact second of reset only matters within a few hours, and Postgres
 *  comparison is timezone-agnostic when both sides are timestamps. */
function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function checkAndIncrementQuota(userId: string): Promise<QuotaResult> {
  // Demo mode: always allow.
  if (!env.db.enabled || userId.startsWith("demo_")) {
    return { allowed: true, used: 0, limit: FREE_MONTHLY, plan: "RECON" };
  }

  const db = getDb();
  const period = monthStart();

  // Step 1: lazy monthly reset. `updateMany` with the period predicate
  // means at most one writer wins the reset; subsequent calls within the
  // same month are no-ops because `freeUsagePeriodStart >= period`.
  await db.user.updateMany({
    where: { id: userId, freeUsagePeriodStart: { lt: period } },
    data: { freeUsageMonth: 0, freeUsagePeriodStart: period },
  });

  // Step 2: read the current state to decide whether to gate.
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true, freeUsageMonth: true },
  });
  if (!user) {
    return { allowed: false, used: 0, limit: FREE_MONTHLY, plan: "RECON" };
  }
  if (user.plan !== "RECON") {
    return { allowed: true, used: user.freeUsageMonth, limit: -1, plan: user.plan };
  }

  // Step 3: atomic conditional increment. Compiles to roughly:
  //   UPDATE "User" SET freeUsageMonth = freeUsageMonth + 1
  //   WHERE id = $1 AND plan = 'RECON' AND freeUsageMonth < 5;
  const result = await db.user.updateMany({
    where: {
      id: userId,
      plan: "RECON",
      freeUsageMonth: { lt: FREE_MONTHLY },
    },
    data: { freeUsageMonth: { increment: 1 } },
  });

  if (result.count === 0) {
    return {
      allowed: false,
      used: user.freeUsageMonth,
      limit: FREE_MONTHLY,
      plan: "RECON",
    };
  }

  return {
    allowed: true,
    used: user.freeUsageMonth + 1,
    limit: FREE_MONTHLY,
    plan: "RECON",
  };
}

/**
 * Rollback a previously-incremented free-tier counter.
 *
 * Called when an autopsy fails AFTER the quota was burned (i.e. AI
 * pipeline error mid-flight). Otherwise the user's failure costs them
 * 1 of 5 monthly slots for nothing.
 *
 * Idempotent w.r.t. month boundaries — if the current month is past
 * the stored period, we don't decrement (the counter has already been
 * reset to 0 and we'd go negative). Bounded at zero defensively too.
 */
export async function rollbackQuotaIncrement(userId: string): Promise<void> {
  if (!env.db.enabled || userId.startsWith("demo_")) return;
  const db = getDb();
  await db.user
    .updateMany({
      where: {
        id: userId,
        plan: "RECON",
        freeUsageMonth: { gt: 0 },
        freeUsagePeriodStart: { gte: monthStart() },
      },
      data: { freeUsageMonth: { decrement: 1 } },
    })
    .catch((err) => {
      // Don't block the user-visible error path on a rollback miss.
      console.error("[quota] rollback failed", err);
    });
}
