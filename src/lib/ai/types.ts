/**
 * Internal AI pipeline types. Distinct from the public AutopsyResponse
 * contract so prompts can evolve without breaking the API.
 */

import type { AutopsyFlag } from "../api/contracts";

export type Direction = "LONG" | "SHORT";

export type ZoneKind =
  | "ORDER_BLOCK"
  | "FVG"
  | "LIQUIDITY"
  | "EQUAL_HIGHS"
  | "EQUAL_LOWS"
  | "ASIA_RANGE";

export interface KeyZone {
  type: ZoneKind;
  tf: string | null;
  side: "BULL" | "BEAR" | null;
  low: number | null;
  high: number | null;
  level: number | null;
  label: string | null;
}

export interface StructureEvent {
  kind: "BOS" | "CHOCH" | "SWEEP" | "INDUCEMENT";
  level: number | null;
  side: "BULL" | "BEAR" | null;
}

export interface TradeMarks {
  entry: number | null;
  stop: number | null;
  target: number | null;
}

/** First-pass output: what the vision model sees on the chart. */
export interface StructureRead {
  symbol: string | null;
  timeframe: string | null;
  direction: Direction | null;
  range: { high: number; low: number } | null;
  candles_visible: number;
  key_zones: KeyZone[];
  structure_events: StructureEvent[];
  trade_marks: TradeMarks;
  session_context: "ASIA" | "LONDON" | "NY" | "OVERLAP" | null;
  /** Vision model's confidence the chart is interpretable. 0..1 */
  confidence: number;
}

/** Second-pass output: narrative + flags + concept tags. */
export interface VerdictRead {
  verdict: string;
  summary: string;
  improvement: string;
  rebuy_zone: string | null;
  flags: AutopsyFlag[];
  concepts: string[];
  /**
   * Optional model-supplied next-action list. When the model omits or
   * malforms this, scoring.ts synthesises actions deterministically
   * from flags + rebuy_zone + improvement so the UI always renders
   * something useful.
   */
  next_actions?: Array<{
    label: string;
    rationale: string;
    tone: "green" | "amber" | "red" | "violet" | "cyan";
  }>;
}

/** Cost telemetry stamped on every Autopsy row. */
export interface CostBreakdown {
  /** Microcents in USD (1/1,000,000 of a dollar). */
  microUsd: number;
  modelVision: string;
  modelVerdict: string;
  visionInputTokens: number;
  visionOutputTokens: number;
  verdictInputTokens: number;
  verdictOutputTokens: number;
}

/** Phase progress event streamed to the client over NDJSON. */
export type ProgressEvent =
  | { event: "progress"; phase: PipelinePhase; pct: number; message: string }
  | { event: "done"; report: import("../api/contracts").AutopsyResponse }
  | { event: "error"; message: string; code?: string };

export type PipelinePhase = "fetch" | "vision" | "verdict" | "score" | "persist";
