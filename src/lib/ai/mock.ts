/**
 * Deterministic mock pipeline for demo mode.
 *
 * Picks one of N archetypes based on a hash of the uploadId so demos
 * see distinct verdicts each upload, instead of a single canned response.
 * Each archetype is a hand-crafted realistic case (clean OB long,
 * liquidity trap short, FOMO chase, patient sniper, fear-out winner).
 */

import type { StructureRead, VerdictRead } from "./types";
import type { AutopsyFlag } from "../api/contracts";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ----------------------------------------------------------------------------
// Archetypes
// ----------------------------------------------------------------------------

interface Archetype {
  structure: StructureRead;
  verdict: VerdictRead;
}

const ARCHETYPES: Archetype[] = [
  // 0 — Liquidity trap short on BTC. The original demo case.
  {
    structure: {
      symbol: "BTCUSDT",
      timeframe: "1H",
      direction: "SHORT",
      range: { high: 67_612, low: 66_820 },
      candles_visible: 14,
      key_zones: [
        { type: "ORDER_BLOCK", tf: "4H", side: "BULL", low: 67_290, high: 67_355, level: null, label: "4H bull OB" },
        { type: "FVG", tf: "1H", side: "BEAR", low: 67_420, high: 67_510, level: null, label: "1H bear FVG" },
        { type: "LIQUIDITY", tf: "1H", side: null, low: null, high: null, level: 67_612, label: "ASIA HIGH" },
        { type: "EQUAL_LOWS", tf: "1H", side: null, low: 66_820, high: null, level: null, label: "Equal lows" },
      ],
      structure_events: [
        { kind: "BOS", level: 67_420, side: "BEAR" },
        { kind: "CHOCH", level: 67_580, side: "BEAR" },
        { kind: "SWEEP", level: 67_612, side: "BULL" },
      ],
      trade_marks: { entry: 67_612.4, stop: 67_790.1, target: 66_840 },
      session_context: "ASIA",
      confidence: 0.84,
    },
    verdict: {
      verdict: "Trapped on the wrong side of session liquidity",
      summary:
        "Short opened directly into ASIA-session highs (67,612). The position filled on a liquidity sweep and immediately reversed back into the 4H bullish order block at 67,290–67,355.",
      improvement:
        "Wait for a 1H CHOCH below 67,500 before shorting from premium. Re-entry at 67,355 (top of 4H OB) with stop above the 67,612 sweep wick. Reduce size 4× until discipline > 70. Block trading in the 30 min after a stop-out for 14 days.",
      rebuy_zone: "67,355 - 67,290",
      flags: [
        flag("revenge", "Revenge entry", "red", 0.81),
        flag("liquidity_grab", "Liquidity grab", "amber", 0.92),
        flag("premium_short", "Premium short", "amber", 0.74),
        flag("trap_fill", "Trap fill", "violet", 0.88),
      ],
      concepts: ["liquidity-grab", "asia-high", "bos", "choch", "order-block", "fvg", "premium-discount", "stop-hunt"],
    },
  },

  // 1 — Clean OB long on EUR/USD during London open.
  {
    structure: {
      symbol: "EURUSD",
      timeframe: "15M",
      direction: "LONG",
      range: { high: 1.0892, low: 1.0824 },
      candles_visible: 18,
      key_zones: [
        { type: "ORDER_BLOCK", tf: "1H", side: "BULL", low: 1.0834, high: 1.0848, level: null, label: "1H bull OB" },
        { type: "FVG", tf: "15M", side: "BULL", low: 1.0852, high: 1.0866, level: null, label: "15M bull FVG" },
        { type: "LIQUIDITY", tf: "15M", side: null, low: null, high: null, level: 1.0824, label: "London low sweep" },
      ],
      structure_events: [
        { kind: "SWEEP", level: 1.0824, side: "BEAR" },
        { kind: "CHOCH", level: 1.0852, side: "BULL" },
        { kind: "BOS", level: 1.087, side: "BULL" },
      ],
      trade_marks: { entry: 1.0846, stop: 1.0822, target: 1.089 },
      session_context: "LONDON",
      confidence: 0.91,
    },
    verdict: {
      verdict: "Clean OB retest after London-low sweep",
      summary:
        "Patiently waited for London to sweep the session low at 1.0824 and print a 15M CHOCH before entering long at 1.0846 — the top of the 1H bull order block. Risk capped at 1R, reached target 1.0890 for +1.8R.",
      improvement:
        "This is your A-setup. Document the playbook: London sweep → CHOCH → OB entry, target opposite range high. Increase size to 1.5x baseline ONLY on this exact pattern. Skip lower-confluence variants.",
      rebuy_zone: null,
      flags: [
        flag("patient_entry", "Patient entry", "green", 0.92),
        flag("size_appropriate", "Size appropriate", "green", 0.85),
        flag("confluence", "OB + FVG confluence", "cyan", 0.78),
      ],
      concepts: ["london-open", "stop-hunt", "choch", "bos", "order-block", "fvg", "buy-side-draw"],
    },
  },

  // 2 — FOMO chase on SOL after a vertical move.
  {
    structure: {
      symbol: "SOLUSDT",
      timeframe: "5M",
      direction: "LONG",
      range: { high: 168.4, low: 158.2 },
      candles_visible: 22,
      key_zones: [
        { type: "FVG", tf: "5M", side: "BULL", low: 162.4, high: 164.1, level: null, label: "Bypassed FVG" },
        { type: "LIQUIDITY", tf: "1H", side: null, low: null, high: null, level: 168.4, label: "Daily high" },
        { type: "EQUAL_HIGHS", tf: "5M", side: null, high: 167.8, low: null, level: null, label: "Equal highs" },
      ],
      structure_events: [
        { kind: "BOS", level: 165.2, side: "BULL" },
        { kind: "INDUCEMENT", level: 167.8, side: "BULL" },
      ],
      trade_marks: { entry: 167.92, stop: 165.8, target: 172 },
      session_context: "NY",
      confidence: 0.78,
    },
    verdict: {
      verdict: "FOMO long into daily high — bought the top",
      summary:
        "Entered long at 167.92, three candles after a vertical breakout, directly under daily-high liquidity at 168.40. Inducement above equal highs at 167.80 was the bait. Price tagged 168.40 then reversed to fill the unmitigated FVG at 162.40–164.10.",
      improvement:
        "Never market-buy after a vertical move. Wait for the high to be swept and a 5M CHOCH lower before considering a re-entry from the 162.40 FVG. If you see equal highs, assume they get raided. Cool-down rule: no new positions for 15 min after any intraday +3% candle.",
      rebuy_zone: "164.10 - 162.40",
      flags: [
        flag("fomo", "FOMO entry", "red", 0.88),
        flag("late_entry", "Late entry", "amber", 0.82),
        flag("fvg_ignored", "FVG ignored", "amber", 0.71),
        flag("trap_fill", "Inducement trap", "violet", 0.76),
      ],
      concepts: ["liquidity-grab", "inducement", "equal-highs", "fvg", "stop-hunt", "buy-side-draw"],
    },
  },

  // 3 — Patient sniper short on XAU during NY open with full confluence.
  {
    structure: {
      symbol: "XAUUSD",
      timeframe: "1H",
      direction: "SHORT",
      range: { high: 2_348.9, low: 2_312.4 },
      candles_visible: 16,
      key_zones: [
        { type: "ORDER_BLOCK", tf: "4H", side: "BEAR", low: 2_341.2, high: 2_345.8, level: null, label: "4H bear OB" },
        { type: "FVG", tf: "1H", side: "BEAR", low: 2_338, high: 2_342.5, level: null, label: "1H bear FVG" },
        { type: "LIQUIDITY", tf: "4H", side: null, low: null, high: null, level: 2_348.9, label: "Weekly high" },
        { type: "EQUAL_LOWS", tf: "1H", side: null, low: 2_312.4, high: null, level: null, label: "Sell-side draw" },
      ],
      structure_events: [
        { kind: "SWEEP", level: 2_348.9, side: "BULL" },
        { kind: "CHOCH", level: 2_338, side: "BEAR" },
      ],
      trade_marks: { entry: 2_343.6, stop: 2_349.4, target: 2_312.4 },
      session_context: "NY",
      confidence: 0.93,
    },
    verdict: {
      verdict: "Textbook NY-open short from premium with weekly-high sweep",
      summary:
        "Waited for NY-open to sweep the weekly high at 2,348.90, then entered short at 2,343.60 inside the 4H bear OB after a 1H CHOCH at 2,338. Risk 5.80, reward to equal lows 31.20 — 5.4R draw. Stop above sweep wick was untouched.",
      improvement:
        "This is the playbook. Tag this trade as setup A+ in your journal. Recurring criteria: weekly liquidity raid + 4H OB + 1H CHOCH + sell-side draw. Commit to taking ALL future instances at full size.",
      rebuy_zone: null,
      flags: [
        flag("patient_entry", "Patient entry", "green", 0.94),
        flag("confluence", "4-factor confluence", "cyan", 0.91),
        flag("size_appropriate", "Size appropriate", "green", 0.86),
      ],
      concepts: ["liquidity-grab", "ny-overlap", "choch", "order-block", "fvg", "premium-discount", "sell-side-draw", "equal-lows"],
    },
  },
];

function flag(key: string, label: string, tone: AutopsyFlag["tone"], confidence: number): AutopsyFlag {
  return { key, label, tone, confidence };
}

// ----------------------------------------------------------------------------
// Public mock entry points
// ----------------------------------------------------------------------------

export function mockStructure(
  uploadId: string,
  _hint?: { symbol?: string; timeframe?: string; direction?: "LONG" | "SHORT" },
): StructureRead {
  // Hints are intentionally ignored in mock mode — the 4 archetypes are
  // self-coherent (symbol, timeframe, direction, prices, narrative all match).
  // Honouring hints would break that coherence (e.g. EURUSD long hint over
  // an XAU short archetype). When OPENAI is wired, hints flow through to
  // the real vision pass instead.
  const archetype = ARCHETYPES[hash(uploadId) % ARCHETYPES.length];
  return clone(archetype.structure);
}

export function mockVerdict(uploadId: string, _structure: StructureRead): VerdictRead {
  const archetype = ARCHETYPES[hash(uploadId) % ARCHETYPES.length];
  return clone(archetype.verdict);
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
