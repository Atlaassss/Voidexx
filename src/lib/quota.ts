/**
 * Free-tier quota check for AI autopsies.
 *
 * Real impl reads/writes `User.freeUsageMonth` in Postgres, reset by a
 * monthly cron (Phase 6 admin work). In demo mode it's a no-op (always
 * allow).
 *
 * RACE-FREE: increments via a single atomic conditional `updateMany`
 * statement. Two concurrent requests near the cap can no longer both
 * pass the check and both increment.
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

export async function checkAndIncrementQuota(userId: string): Promise<QuotaResult> {
  // Demo mode: always allow.
  if (!env.db.enabled || userId.startsWith("demo_")) {
    return { allowed: true, used: 0, limit: FREE_MONTHLY, plan: "RECON" };
  }

  const db = getDb();

  // Look up the plan first. We allow paid tiers unconditionally and only
  // gate RECON, so this read is correct outside the atomic increment.
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

  // Atomic conditional increment. `updateMany` is used (instead of `update`)
  // so we can include a non-PK predicate in WHERE, which Prisma's `update`
  // doesn't allow. The single SQL statement compiles to roughly:
  //   UPDATE "User" SET freeUsageMonth = freeUsageMonth + 1
  //   WHERE id = $1 AND plan = 'RECON' AND freeUsageMonth < 5;
  // If `count` is 0 the row was either gone, upgraded, or already at cap.
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
