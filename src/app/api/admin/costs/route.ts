import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { asResponse } from "@/lib/auth";
import { tryGetDb } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/admin/costs?days=30
 *
 * Returns AI cost breakdown for the admin dashboard.
 * Groups costs by day and model version.
 *
 * Demo mode: returns deterministic mock cost data.
 */
export async function GET(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    const r = asResponse(err);
    return r ?? new Response("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 30)));

  const db = tryGetDb();
  if (!db || admin.isDemo) {
    return NextResponse.json({ ...DEMO_COSTS, demo: true });
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Get daily aggregated costs
  const autopsies = await db.autopsy.findMany({
    where: { createdAt: { gte: since } },
    select: {
      costMicros: true,
      modelVersion: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Aggregate by day
  const dailyMap = new Map<string, { costMicros: number; count: number }>();
  const modelMap = new Map<string, { costMicros: number; count: number }>();

  for (const a of autopsies) {
    const day = a.createdAt.toISOString().split("T")[0]!;
    const existing = dailyMap.get(day) ?? { costMicros: 0, count: 0 };
    existing.costMicros += a.costMicros;
    existing.count += 1;
    dailyMap.set(day, existing);

    const model = a.modelVersion;
    const mExisting = modelMap.get(model) ?? { costMicros: 0, count: 0 };
    mExisting.costMicros += a.costMicros;
    mExisting.count += 1;
    modelMap.set(model, mExisting);
  }

  const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    costUsd: data.costMicros / 1_000_000,
    count: data.count,
    avgCostUsd: data.count > 0 ? data.costMicros / 1_000_000 / data.count : 0,
  }));

  const byModel = Array.from(modelMap.entries()).map(([model, data]) => ({
    model,
    costUsd: data.costMicros / 1_000_000,
    count: data.count,
    avgCostUsd: data.count > 0 ? data.costMicros / 1_000_000 / data.count : 0,
  }));

  const totalCostUsd = autopsies.reduce((s, a) => s + a.costMicros, 0) / 1_000_000;
  const totalAutopsies = autopsies.length;

  return NextResponse.json({
    daily,
    byModel,
    totalCostUsd,
    totalAutopsies,
    avgCostPerAutopsy: totalAutopsies > 0 ? totalCostUsd / totalAutopsies : 0,
    periodDays: days,
  });
}

const DEMO_COSTS = {
  daily: [
    { date: "2025-05-15", costUsd: 12.34, count: 48, avgCostUsd: 0.257 },
    { date: "2025-05-16", costUsd: 15.67, count: 61, avgCostUsd: 0.257 },
    { date: "2025-05-17", costUsd: 8.92, count: 35, avgCostUsd: 0.255 },
    { date: "2025-05-18", costUsd: 18.45, count: 72, avgCostUsd: 0.256 },
    { date: "2025-05-19", costUsd: 14.23, count: 55, avgCostUsd: 0.259 },
    { date: "2025-05-20", costUsd: 21.08, count: 82, avgCostUsd: 0.257 },
    { date: "2025-05-21", costUsd: 16.54, count: 64, avgCostUsd: 0.258 },
  ],
  byModel: [
    { model: "voidexx-vision-1", costUsd: 89.4, count: 350, avgCostUsd: 0.255 },
    { model: "voidexx-vision-2-beta", costUsd: 17.83, count: 67, avgCostUsd: 0.266 },
  ],
  totalCostUsd: 107.23,
  totalAutopsies: 417,
  avgCostPerAutopsy: 0.257,
  periodDays: 30,
};
