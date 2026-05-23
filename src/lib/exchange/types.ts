/**
 * Unified exchange types.
 *
 * Each venue (BingX, Binance, Bybit, OKX, ...) returns balance and
 * position data in its own shape. We normalise to a single internal
 * shape so callers don't branch on venue. Adapter functions per venue
 * live in `src/lib/exchange/<venue>.ts`.
 */

import type { Venue } from "@prisma/client";

export type { Venue };

/** Shape of a per-asset balance line. Numbers are USD-equivalent strings. */
export interface UnifiedBalance {
  /** Total USD value across all assets in the account. */
  usdTotal: number;
  /** USD value of unrealised P&L on open positions, if reported. */
  usdUnrealizedPnl?: number;
  /** Per-asset breakdown. Optional — some venues only report aggregate. */
  assets?: Array<{
    asset: string;
    free: number;
    locked: number;
  }>;
}

/** Shape of an open trading position. */
export interface UnifiedPosition {
  symbol: string;
  side: "LONG" | "SHORT";
  size: number;
  entryPrice: number;
  /** Latest mark price the venue used to compute unrealised P&L. */
  markPrice?: number;
  /** Unrealised P&L in account currency (usually USD). */
  unrealizedPnl?: number;
  /** Optional R-multiple if a stop is configured. */
  rMultiple?: number;
  /** When the position was opened, if reported. */
  openedAt?: Date;
}

/** Decrypted credentials passed to a venue client. */
export interface VenueCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
}

/** What every venue client implements. */
export interface VenueClient {
  /** Probe used at connect time to verify keys before persisting them. */
  probe(creds: VenueCredentials, signal?: AbortSignal): Promise<{ ok: true } | { ok: false; reason: string }>;
  getBalance(creds: VenueCredentials, signal?: AbortSignal): Promise<UnifiedBalance>;
  getOpenPositions(creds: VenueCredentials, signal?: AbortSignal): Promise<UnifiedPosition[]>;
}

/** Errors all venue clients should throw, so route handlers can branch on them. */
export class VenueAuthError extends Error {
  readonly code = "venue_auth_failed";
}
export class VenueRateLimited extends Error {
  readonly code = "venue_rate_limited";
}
export class VenueUnavailable extends Error {
  readonly code = "venue_unavailable";
}
