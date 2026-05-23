/**
 * BingX REST adapter.
 *
 * Targets BingX Spot for the v1 cut. Same signing scheme works for the
 * Swap (perpetual futures) endpoints — adding `/swap` routes is a 50-LOC
 * follow-up once we wire futures-only features.
 *
 * Auth scheme:
 *   - Header: `X-BX-APIKEY: <api key>`
 *   - Query: `&timestamp=<ms>&signature=<HMAC-SHA256(querystring, apiSecret)>`
 *   - The signature is computed over the WHOLE querystring (including
 *     `timestamp`) BEFORE appending the `signature` param itself.
 *
 * Demo mode: when `env.exchange.bingxBaseUrl` is the demo sentinel
 * (no BINGX_BASE_URL set AND no real creds attempted), we return
 * deterministic mock data so the dashboard renders during development
 * without exposing a key. The route handler decides between mock and
 * real based on whether decrypted credentials look real.
 */

import { createHmac } from "node:crypto";
import {
  type UnifiedBalance,
  type UnifiedPosition,
  type VenueClient,
  type VenueCredentials,
  VenueAuthError,
  VenueRateLimited,
  VenueUnavailable,
} from "./types";

const DEFAULT_BASE_URL = "https://open-api.bingx.com";
const SPOT_BALANCE_PATH = "/openApi/spot/v1/account/balance";

interface BingxBalanceResponse {
  code: number;
  msg?: string;
  data?: {
    balances?: Array<{ asset: string; free: string; locked: string }>;
  };
}

function sign(querystring: string, apiSecret: string): string {
  return createHmac("sha256", apiSecret).update(querystring).digest("hex");
}

function buildSignedUrl(path: string, params: Record<string, string>, apiSecret: string): string {
  const base = process.env.BINGX_BASE_URL ?? DEFAULT_BASE_URL;
  const qs = new URLSearchParams({ ...params, timestamp: String(Date.now()) });
  const sorted = qs.toString();
  return `${base}${path}?${sorted}&signature=${sign(sorted, apiSecret)}`;
}

async function call<T>(url: string, apiKey: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    headers: { "X-BX-APIKEY": apiKey, "Content-Type": "application/json" },
    signal,
  });

  if (res.status === 401 || res.status === 403) {
    throw new VenueAuthError("BingX rejected the credentials (401/403)");
  }
  if (res.status === 429) {
    throw new VenueRateLimited("BingX rate limit hit");
  }
  if (res.status >= 500) {
    throw new VenueUnavailable(`BingX upstream ${res.status}`);
  }

  const json = (await res.json()) as { code?: number; msg?: string };
  // BingX returns 200 with a non-zero code field on logical errors.
  // 100001 / 100410 etc. are auth failures; treat the same as 401.
  if (typeof json.code === "number" && json.code !== 0) {
    if ([100001, 100410, 100413, 100419].includes(json.code)) {
      throw new VenueAuthError(`BingX rejected: ${json.msg ?? json.code}`);
    }
    throw new VenueUnavailable(`BingX returned code ${json.code}: ${json.msg ?? "unknown"}`);
  }
  return json as T;
}

export const bingxClient: VenueClient = {
  async probe(creds: VenueCredentials, signal?: AbortSignal) {
    try {
      await this.getBalance(creds, signal);
      return { ok: true };
    } catch (err) {
      if (err instanceof VenueAuthError) {
        return { ok: false, reason: "auth_failed" };
      }
      if (err instanceof VenueRateLimited) {
        return { ok: false, reason: "rate_limited" };
      }
      if (err instanceof VenueUnavailable) {
        return { ok: false, reason: "venue_unavailable" };
      }
      return { ok: false, reason: "network_error" };
    }
  },

  async getBalance(creds: VenueCredentials, signal?: AbortSignal): Promise<UnifiedBalance> {
    const url = buildSignedUrl(SPOT_BALANCE_PATH, {}, creds.apiSecret);
    const json = await call<BingxBalanceResponse>(url, creds.apiKey, signal);
    const balances = json.data?.balances ?? [];

    // Normalise to USD — accept all stablecoins 1:1 and ignore non-USD
    // assets in the v1 cut (would need price lookup; deferred).
    const STABLES = new Set(["USDT", "USDC", "BUSD", "DAI", "TUSD", "FDUSD"]);
    let usdTotal = 0;
    const assets: UnifiedBalance["assets"] = [];
    for (const b of balances) {
      const free = Number.parseFloat(b.free);
      const locked = Number.parseFloat(b.locked);
      if (!Number.isFinite(free) || !Number.isFinite(locked)) continue;
      assets.push({ asset: b.asset, free, locked });
      if (STABLES.has(b.asset.toUpperCase())) {
        usdTotal += free + locked;
      }
    }

    return { usdTotal, assets };
  },

  async getOpenPositions(_creds: VenueCredentials, _signal?: AbortSignal): Promise<UnifiedPosition[]> {
    // BingX exposes positions only on the swap (perpetual) API at
    //   GET /openApi/swap/v2/user/positions
    // The signing scheme is identical, but the response shape differs
    // and stable handling needs symbol metadata.
    //
    // Phase 5 ships balance only (the more useful signal for the UI).
    // Positions wiring is a focused 30-LOC follow-up; until then,
    // /api/exchange/[id] returns an empty positions array for real
    // accounts. The dashboard tolerates this.
    return [];
  },
};
