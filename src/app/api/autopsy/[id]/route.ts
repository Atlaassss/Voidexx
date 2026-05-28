import { NextResponse } from "next/server";
import { requireUser, asResponse } from "@/lib/auth";
import { tryGetDb } from "@/lib/db";
import type { AutopsyResponse, AutopsyFlag } from "@/lib/api/contracts";
import { deriveWinProbability, deriveRiskLevel, deriveNextActions } from "@/lib/ai/scoring";
import type { StructureRead, VerdictRead } from "@/lib/ai/types";

export const runtime = "nodejs";

/**
 * GET /api/autopsy/:id
 *
 * Returns a persisted autopsy. Used by the journal detail view (not yet
 * wired) and any direct-link share flow. Returns 404 in demo mode since
 * there's no persistence.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch (err) {
    const r = asResponse(err);
    return r ?? new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const db = tryGetDb();
  if (!db) {
    return NextResponse.json({ error: "not_found", reason: "demo_mode" }, { status: 404 });
  }

  const row = await db.autopsy.findUnique({
    where: { id },
    include: { trade: true },
  });
  if (!row || row.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Reconstruct AutopsyFlag list from the persisted flag keys + structureJson.
  // Confidence isn't stored per-flag yet (Phase 6 schema bump). Default to 0.7.
  const flags: AutopsyFlag[] = (row.flags as string[]).map((key) => ({
    key,
    label: prettyLabel(key),
    tone: defaultTone(key),
    confidence: 0.7,
  }));

  // Re-derive Phase-9 signals (winProbability, riskLevel, nextActions)
  // from the persisted structure + reconstructed verdict shape. We
  // don't store these directly because (a) they're cheap to recompute
  // and (b) their definition can evolve in scoring.ts without needing
  // a backfill migration.
  const concepts = (row.concepts as string[]) ?? [];
  const verdictRead: VerdictRead = {
    verdict: row.verdict,
    summary: row.summary,
    improvement: row.improvement,
    rebuy_zone: row.rebuyZone ?? null,
    flags,
    concepts,
  };
  // structureJson can be null in older rows (pre-Phase-9). Fall back to
  // a minimal stub so deriveRiskLevel/deriveWinProbability still work
  // — they treat unknown fields as the worst-case (low confidence,
  // missing trade marks).
  const structureRead: StructureRead =
    (row.structureJson as unknown as StructureRead | null) ?? {
      symbol: null,
      timeframe: null,
      direction: null,
      range: null,
      candles_visible: 0,
      key_zones: [],
      structure_events: [],
      trade_marks: { entry: null, stop: null, target: null },
      session_context: null,
      confidence: 0.5,
    };

  const winProbability = deriveWinProbability(structureRead, verdictRead, row.score);
  const riskLevel = deriveRiskLevel(structureRead, verdictRead, row.score);
  const nextActions = deriveNextActions(structureRead, verdictRead, riskLevel);

  const response: AutopsyResponse = {
    id: row.id,
    tradeId: row.tradeId,
    score: row.score,
    winProbability,
    riskLevel,
    nextActions,
    verdict: row.verdict,
    summary: row.summary,
    improvement: row.improvement,
    rebuyZone: row.rebuyZone ?? undefined,
    flags,
    concepts,
    structure: (row.structureJson as Record<string, unknown> | null) ?? undefined,
    cost: {
      microUsd: row.costMicros,
      modelVision: row.modelVersion.split("+")[0] ?? row.modelVersion,
      modelVerdict: row.modelVersion.split("+")[1] ?? row.modelVersion,
    },
    createdAt: row.createdAt.toISOString(),
  };

  return NextResponse.json(response);
}

function prettyLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/(^|\s)\S/g, (s) => s.toUpperCase());
}

function defaultTone(key: string): AutopsyFlag["tone"] {
  if (["revenge", "trap_fill", "fomo"].includes(key)) return "red";
  if (["liquidity_grab", "premium_short", "late_entry", "fvg_ignored", "fear_exit"].includes(key))
    return "amber";
  if (["patient_entry", "size_appropriate"].includes(key)) return "green";
  if (["confluence"].includes(key)) return "cyan";
  return "violet";
}
