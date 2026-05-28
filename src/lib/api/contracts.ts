/**
 * VOIDEXX API contracts.
 *
 * Types here are the source of truth for both server route handlers and
 * client React Query hooks. Keep zod / valibot validators alongside in
 * a follow-up so we get runtime guards too.
 */

export type Direction = "LONG" | "SHORT";
export type Outcome = "OPEN" | "WIN" | "LOSS" | "BREAKEVEN" | "CANCELLED";

export interface AutopsyRequest {
  /** Server-resolved upload id (image already in S3 / blob storage). */
  uploadId: string;
  /** Optional user-provided context. */
  symbol?: string;
  timeframe?: string;
  direction?: Direction;
  notes?: string;
}

export interface AutopsyFlag {
  key: string;
  label: string;
  tone: "red" | "amber" | "violet" | "green" | "cyan";
  confidence: number; // 0..1
}

/**
 * Risk band of the setup as it was actually traded.
 *
 * - LOW       : structurally clean, multi-confluence, modest size
 * - MEDIUM    : valid but with a single soft flag (late entry, mild premium)
 * - HIGH      : multiple warning flags or single critical mistake
 * - EXTREME   : revenge trades, FOMO chases, blind premium shorts
 */
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

export interface NextAction {
  /** What to do, action-first (imperative voice). Max ~110 chars. */
  label: string;
  /** Why it matters — short justification. */
  rationale: string;
  /** Tone drives the colour of the marker on the UI. */
  tone: "green" | "amber" | "red" | "violet" | "cyan";
}

export interface AutopsyResponse {
  id: string;
  tradeId: string;
  score: number; // 0..100
  /**
   * Probability (0..1) that following the *corrected* plan in
   * `improvement` + `nextActions` would have produced a winning trade
   * given the same chart context. Derived deterministically from
   * structure + flags + score in `scoring.ts` so the model can't drift.
   */
  winProbability: number;
  /**
   * Discrete risk band for the trade as actually executed. Derived
   * alongside winProbability — independent axis. A high-prob setup
   * with oversized leverage can still be EXTREME risk.
   */
  riskLevel: RiskLevel;
  /**
   * Ordered list of "what to do next" recommendations. The first item
   * is the most urgent. Pulled from the verdict's improvement plan
   * when the model populated it; otherwise synthesised from rebuyZone
   * + flags + the worst-offender concept tags.
   */
  nextActions: NextAction[];
  verdict: string;
  summary: string;
  improvement: string;
  rebuyZone?: string;
  flags: AutopsyFlag[];
  concepts: string[];
  ocr?: Record<string, unknown>;
  structure?: Record<string, unknown>;
  smartMoney?: Record<string, unknown>;
  psychology?: Record<string, unknown>;
  /** Token + USD cost telemetry, populated when AI is configured. */
  cost?: {
    microUsd: number;
    modelVision: string;
    modelVerdict: string;
  };
  /** True when the verdict came from a mock pipeline (no OPENAI_API_KEY). */
  mock?: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  cursor: string | null;
  total?: number;
}
