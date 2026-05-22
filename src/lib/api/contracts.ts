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

export interface AutopsyResponse {
  id: string;
  tradeId: string;
  score: number; // 0..100
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
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  cursor: string | null;
  total?: number;
}

export type AutomationKind =
  | "ORDER_PLACED"
  | "ORDER_CANCELLED"
  | "ORDER_FILLED"
  | "RISK_CAP_HIT"
  | "STRATEGY_TOGGLED"
  | "DAILY_LOSS_LOCKOUT"
  | "TILT_LOCKOUT";

export interface AutomationLog {
  id: string;
  kind: AutomationKind;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}
