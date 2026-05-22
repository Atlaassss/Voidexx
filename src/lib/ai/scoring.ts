/**
 * Deterministic 0–100 score for an autopsy.
 *
 * The score is computed from transparent rules over the parsed structure
 * and verdict flags — NOT asked of the model. This keeps the metric
 * stable, auditable, and resistant to prompt drift.
 *
 * Tuning notes:
 * - Base 50.
 * - Structural correctness raises it (clean OB entry, good R:R, premium/discount aligned).
 * - Mistake flags subtract weighted by confidence.
 * - Clamp to 0..100.
 */

import type { StructureRead, VerdictRead } from "./types";

const FLAG_WEIGHTS: Record<string, number> = {
  // critical mistakes
  revenge: 25,
  trap_fill: 22,
  liquidity_grab: 18,
  fomo: 15,
  late_entry: 10,
  fear_exit: 8,
  fvg_ignored: 8,
  premium_short: -5, // can be valid for SHORT, soft penalty
  // positive signals
  patient_entry: -10, // boosts score
  size_appropriate: -6,
  confluence: -8,
};

export function scoreAutopsy(structure: StructureRead, verdict: VerdictRead): number {
  let score = 50;

  // Structural quality bonuses
  const obs = structure.key_zones.filter((z) => z.type === "ORDER_BLOCK");
  const fvgs = structure.key_zones.filter((z) => z.type === "FVG");
  const liq = structure.key_zones.filter((z) => z.type === "LIQUIDITY");
  if (obs.length >= 1 && fvgs.length >= 1) score += 8; // confluence visible

  const entry = structure.trade_marks.entry;
  if (entry != null && structure.range) {
    const mid = (structure.range.high + structure.range.low) / 2;
    if (structure.direction === "SHORT" && entry > mid) score += 6; // shorting from premium
    if (structure.direction === "LONG" && entry < mid) score += 6; // longing from discount
    if (structure.direction === "SHORT" && entry < mid) score -= 4; // shorting from discount
    if (structure.direction === "LONG" && entry > mid) score -= 4; // longing from premium
  }

  // Trade mark bonuses
  const tm = structure.trade_marks;
  if (tm.entry != null && tm.stop != null && tm.target != null) {
    const risk = Math.abs(tm.entry - tm.stop);
    const reward = Math.abs(tm.target - tm.entry);
    const rr = risk > 0 ? reward / risk : 0;
    if (rr >= 3) score += 6;
    else if (rr >= 2) score += 3;
    else if (rr < 1 && risk > 0) score -= 8;
  }

  // Liquidity awareness penalty: entry directly into a liquidity level on the wrong side
  if (entry != null && liq.length > 0 && structure.direction) {
    for (const z of liq) {
      const lvl = z.level ?? z.high ?? z.low;
      if (lvl == null) continue;
      const tooClose = Math.abs(entry - lvl) / Math.max(1, Math.abs(entry)) < 0.003; // 0.3%
      if (tooClose) {
        if (structure.direction === "SHORT" && entry < lvl) score -= 10; // shorting BELOW BSL
        if (structure.direction === "LONG" && entry > lvl) score -= 10; // longing ABOVE SSL
        if (structure.direction === "LONG" && entry < lvl) score -= 6; // longing INTO BSL trap
      }
    }
  }

  // Apply flag deltas
  for (const f of verdict.flags) {
    const w = FLAG_WEIGHTS[f.key];
    if (w == null) continue;
    score -= w * (f.confidence ?? 0.6);
  }

  // Confidence dampening: low-conf reads get pushed toward 50
  const damp = 1 - Math.max(0, 0.6 - structure.confidence);
  score = 50 + (score - 50) * damp;

  return Math.max(0, Math.min(100, Math.round(score)));
}
