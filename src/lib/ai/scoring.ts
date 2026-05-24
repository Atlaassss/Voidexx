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
import type { NextAction, RiskLevel } from "../api/contracts";

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

  // Floor at 2 (not 0) so multiple catastrophically-bad trades still
  // differentiate. A literal 0 reads as "not yet scored" to humans;
  // 2 says "this is the worst end of the scale".
  return Math.max(2, Math.min(100, Math.round(score)));
}

// ---------------------------------------------------------------------------
// Phase 9 — derived signals
//
// These are surfaced on the autopsy report alongside the score:
//
//   - winProbability : 0..1, "if you'd taken the corrected plan in
//                      `nextActions` instead, how likely was the trade
//                      to print green?"
//   - riskLevel      : LOW | MEDIUM | HIGH | EXTREME, the danger band
//                      of the trade as it was actually executed.
//   - nextActions    : 3-5 ordered, imperative-voice steps for what to
//                      do next. Synthesised from the verdict if the
//                      model didn't supply them.
//
// All three are deterministic over (structure, verdict, score) so the
// numbers don't drift between identical chart inputs.
// ---------------------------------------------------------------------------

/**
 * Derive an out-of-100 → 0..1 win-probability *for the corrected setup*.
 *
 * The intuition: a 92-score trade was already a textbook execution and
 * the corrected plan barely differs from what was done — high win prob.
 * A 22-score revenge-FOMO trade has a corrected plan that looks
 * NOTHING like what was traded, so the corrected setup's prob is
 * pulled toward a structural baseline (~0.55 — what a clean OB entry
 * with confluence historically prints). We don't go below 0.35 or
 * above 0.92 because (a) the corrected plan still has slippage / news
 * risk and (b) the score itself has uncertainty.
 *
 * Confluence visible on the chart pushes prob up, single-direction
 * trades against premium/discount push it down.
 */
export function deriveWinProbability(
  structure: StructureRead,
  verdict: VerdictRead,
  score: number,
): number {
  // Anchor on the score, but compress the range so even a 2-score
  // trade's CORRECTED plan starts at a respectable baseline.
  // score   95 → 0.92
  // score   75 → 0.78
  // score   50 → 0.62
  // score   25 → 0.48
  // score    2 → 0.36
  let p = 0.36 + (score / 100) * 0.56;

  // Confluence bonuses — multiple structural anchors raise probability.
  const obs = structure.key_zones.filter((z) => z.type === "ORDER_BLOCK").length;
  const fvgs = structure.key_zones.filter((z) => z.type === "FVG").length;
  const liq = structure.key_zones.filter((z) => z.type === "LIQUIDITY").length;
  const confluence = Math.min(3, obs + fvgs + liq);
  p += confluence * 0.015;

  // Confidence dampening — uninterpretable charts pull toward 0.55.
  if (structure.confidence < 0.6) {
    p = 0.55 + (p - 0.55) * (0.6 + structure.confidence * 0.6);
  }

  // Critical-flag penalties on the EXECUTED trade reduce confidence
  // that the corrected plan covers all the same blind spots.
  for (const f of verdict.flags) {
    if (f.tone === "red") p -= 0.04 * (f.confidence ?? 0.6);
    if (f.tone === "green") p += 0.025 * (f.confidence ?? 0.6);
  }

  return clamp01(p, 0.35, 0.92);
}

/**
 * Derive a discrete risk band for the trade-as-traded.
 *
 * The score answers "how good was this trade?". riskLevel answers a
 * different question: "how dangerous was it?". A patient sniper trade
 * at 92 is LOW risk. A coin-flip 50-score trade with no SL marked is
 * EXTREME, even though the score is mid.
 *
 * Inputs:
 *  - red flags pull toward EXTREME
 *  - missing stop-loss → at least HIGH
 *  - bad R:R (<1) → at least HIGH
 *  - liquidity proximity flagged → at least MEDIUM
 *  - clean confluence + good R:R + green flags → LOW
 */
export function deriveRiskLevel(
  structure: StructureRead,
  verdict: VerdictRead,
  score: number,
): RiskLevel {
  let danger = 0;

  // Score band — mostly a tie-breaker.
  if (score < 30) danger += 3;
  else if (score < 50) danger += 2;
  else if (score < 70) danger += 1;

  // Critical flags — these are the dominant signal.
  for (const f of verdict.flags) {
    if (f.tone === "red") danger += 2;
    else if (f.tone === "amber") danger += 1;
    else if (f.tone === "green") danger -= 1;
  }

  // Risk-management red-flags from raw structure.
  const tm = structure.trade_marks;
  if (tm.entry == null) danger += 1; // no entry visible — sloppy chart
  if (tm.stop == null) danger += 2; // NO STOP-LOSS — always dangerous
  if (tm.entry != null && tm.stop != null && tm.target != null) {
    const risk = Math.abs(tm.entry - tm.stop);
    const reward = Math.abs(tm.target - tm.entry);
    const rr = risk > 0 ? reward / risk : 0;
    if (rr < 1 && risk > 0) danger += 2; // negative-EV by structure
    if (rr >= 3) danger -= 1; // good R:R lowers risk
  }

  // Confidence — uninterpretable charts add baseline danger.
  if (structure.confidence < 0.5) danger += 1;

  if (danger >= 5) return "EXTREME";
  if (danger >= 3) return "HIGH";
  if (danger >= 1) return "MEDIUM";
  return "LOW";
}

/**
 * Synthesise an ordered next-actions list when the model didn't supply
 * one. We assemble it from:
 *
 *   1. Top critical flag → "stop doing X"
 *   2. Rebuy zone → "consider re-entry at <range>"
 *   3. Concept tags → "study X" (max 1)
 *   4. Improvement first sentence → "do this"
 *
 * The model-supplied list is preferred; this is the deterministic
 * fallback so the UI never renders an empty next-actions panel.
 */
export function deriveNextActions(
  structure: StructureRead,
  verdict: VerdictRead,
  riskLevel: RiskLevel,
): NextAction[] {
  // If the model already wrote them, validate + return — but always
  // append a "log this in your journal" if there's room.
  if (verdict.next_actions && verdict.next_actions.length > 0) {
    const out = verdict.next_actions.slice(0, 5).map(
      (a): NextAction => ({
        label: a.label,
        rationale: a.rationale,
        tone: a.tone,
      }),
    );
    return out;
  }

  const out: NextAction[] = [];

  // 1) Stop doing the worst thing — pick the highest-confidence red flag.
  const topRed = [...verdict.flags]
    .filter((f) => f.tone === "red")
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
  if (topRed) {
    out.push({
      label: stopActionFor(topRed.key, topRed.label),
      rationale: `Flagged with ${(topRed.confidence * 100).toFixed(0)}% confidence — recurring pattern detected.`,
      tone: "red",
    });
  }

  // 2) Concrete entry trigger — derived from rebuy zone.
  if (verdict.rebuy_zone) {
    out.push({
      label: `Wait for confirmation in ${verdict.rebuy_zone} before re-entering.`,
      rationale: "This zone preserves the original thesis without chasing price.",
      tone: "green",
    });
  } else if (structure.range && structure.direction) {
    const mid = (structure.range.high + structure.range.low) / 2;
    out.push({
      label:
        structure.direction === "LONG"
          ? `Re-enter only on a discount print below ${formatPrice(mid)} after a CHOCH.`
          : `Re-enter only on a premium print above ${formatPrice(mid)} after a CHOCH.`,
      rationale: "Trading from premium/discount aligns with the structure.",
      tone: "green",
    });
  }

  // 3) Risk-management instruction tied to riskLevel.
  if (riskLevel === "EXTREME") {
    out.push({
      label: "Cut size by 75% for the next 5 trades; require pre-set stop on entry.",
      rationale: "EXTREME risk reading — capital preservation outranks setup quality this week.",
      tone: "red",
    });
  } else if (riskLevel === "HIGH") {
    out.push({
      label: "Half-size for the next 3 trades and journal each entry trigger.",
      rationale: "HIGH risk reading — recover discipline before scaling.",
      tone: "amber",
    });
  } else if (riskLevel === "MEDIUM") {
    out.push({
      label: "Maintain baseline size; review this autopsy before the next entry.",
      rationale: "MEDIUM risk reading — fixable with small process tweaks.",
      tone: "amber",
    });
  } else {
    out.push({
      label: "Tag this in your journal as a repeatable A-setup.",
      rationale: "LOW risk reading — codify the playbook so future-you executes it on autopilot.",
      tone: "green",
    });
  }

  // 4) Study tag — pull the most informative concept.
  const conceptToStudy = pickStudyConcept(verdict.concepts);
  if (conceptToStudy && out.length < 4) {
    out.push({
      label: `Study the ${conceptToStudy.replace(/-/g, " ")} mechanic in the Learn module.`,
      rationale: "Repeated exposure to the structural pattern that broke this trade.",
      tone: "violet",
    });
  }

  // 5) Always close with the watchpoint.
  if (out.length < 5) {
    out.push({
      label: "Set a price alert at the invalidation level — don't watch the chart.",
      rationale: "Reduces tilt from intra-bar volatility on the next trade.",
      tone: "cyan",
    });
  }

  return out.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function clamp01(n: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, n));
}

function formatPrice(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (Math.abs(n) >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

function stopActionFor(key: string, fallbackLabel: string): string {
  const map: Record<string, string> = {
    revenge: "Block trading for 60 minutes after any stop-out — automate the lockout.",
    fomo: "Skip the trade if more than 2 consecutive same-direction candles preceded the entry.",
    trap_fill: "Reject any entry that fills against unmitigated session liquidity.",
    liquidity_grab: "Wait for the sweep to print on the OPPOSITE side before fading liquidity.",
    late_entry: "If the BOS already printed, switch to limit-order entry at the OB instead of market.",
    fvg_ignored: "Mark every untouched FVG and treat them as required magnets before targets.",
    fear_exit: "Pre-commit to your stop in the order ticket; never cancel a stop manually.",
    premium_short: "Refuse short entries below mid-range — confirm the higher-timeframe premium first.",
  };
  return map[key] ?? `Stop the "${fallbackLabel}" pattern — codify the rule that prevents it.`;
}

function pickStudyConcept(concepts: string[]): string | null {
  // Prefer the most "load-bearing" concept that explains the failure.
  const priority = [
    "liquidity-grab",
    "stop-hunt",
    "inducement",
    "premium-discount",
    "asia-high",
    "london-open",
    "ny-overlap",
    "choch",
    "bos",
    "order-block",
    "fvg",
  ];
  for (const p of priority) if (concepts.includes(p)) return p;
  return concepts[0] ?? null;
}
