import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { asResponse } from "@/lib/auth";
import { tryGetDb } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/admin/stats
 *
 * Returns platform-wide stats for the admin dashboard.
 * Demo mode: returns deterministic mock stats.
 */
export async function GET() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    const r = asResponse(err);
    return r ?? new Response("Forbidden", { status: 403 });
  }

  const db = tryGetDb();
  if (!db || admin.isDemo) {
    return NextResponse.json({ ...DEMO_STATS, demo: true });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeSubscriptions,
    totalAutopsies,
    recentAutopsies,
    totalRevenueCents,
    aiCostMicros,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { subscriptionStatus: "active" } }),
    db.autopsy.count(),
    db.autopsy.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    db.payment
      .aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } })
      .then((r) => r._sum.amountCents ?? 0),
    db.autopsy
      .aggregate({ _sum: { costMicros: true } })
      .then((r) => r._sum.costMicros ?? 0),
  ]);

  return NextResponse.json({
    totalUsers,
    activeSubscriptions,
    totalAutopsies,
    recentAutopsies,
    totalRevenueCents,
    aiCostMicros,
  });
}

const DEMO_STATS = {
  totalUsers: 1247,
  activeSubscriptions: 312,
  totalAutopsies: 8934,
  recentAutopsies: 1456,
  totalRevenueCents: 4680000,
  aiCostMicros: 23400000,
};
