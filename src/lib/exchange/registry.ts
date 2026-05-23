/**
 * Single source of truth for which venues we support and which client
 * adapter handles each. New venues plug in here.
 */

import type { Venue } from "@prisma/client";
import { bingxClient } from "./bingx";
import type { VenueClient } from "./types";

export const VENUE_CLIENTS: Partial<Record<Venue, VenueClient>> = {
  BINGX: bingxClient,
  // BINANCE, BYBIT, OKX, KUCOIN, MT5 — Phase 5.5+
};

export function clientFor(venue: Venue): VenueClient | null {
  return VENUE_CLIENTS[venue] ?? null;
}

export const SUPPORTED_VENUES: Venue[] = Object.keys(VENUE_CLIENTS).filter(
  (v) => VENUE_CLIENTS[v as Venue],
) as Venue[];
