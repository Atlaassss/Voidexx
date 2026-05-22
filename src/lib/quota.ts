/**
 * Free-tier quota check for AI autopsies.
 *
 * Real impl reads/writes `User.freeUsageMonth` in Postgres, reset by a
 * daily cron. In demo mode it's a no-op (always allow).
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
  if (user.freeUsageMonth >= FREE_MONTHLY) {
    return {
      allowed: false,
      used: user.freeUsageMonth,
      limit: FREE_MONTHLY,
      plan: "RECON",
    };
  }
  await db.user.update({
    where: { id: userId },
    data: { freeUsageMonth: { increment: 1 } },
  });
  return {
    allowed: true,
    used: user.freeUsageMonth + 1,
    limit: FREE_MONTHLY,
    plan: "RECON",
  };
}
