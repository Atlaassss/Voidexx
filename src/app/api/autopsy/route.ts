import { NextResponse } from "next/server";
import type { AutopsyRequest, AutopsyResponse } from "@/lib/api/contracts";

export const runtime = "nodejs";

/**
 * POST /api/autopsy
 *
 * Stub. Production wiring:
 *   1. Auth middleware -> resolve userId
 *   2. Quota check (free tier: 5/month)
 *   3. Pull image from blob storage by uploadId
 *   4. Fan-out to AI workers (vision, OCR, structure, SMC, psych)
 *   5. Persist Trade + Autopsy via Prisma
 *   6. Return AutopsyResponse
 *
 * For now: return a deterministic mock so the front-end works end-to-end.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<AutopsyRequest>;

  // Simulate engine latency in dev only.
  await new Promise((r) => setTimeout(r, 800));

  const now = new Date().toISOString();
  const response: AutopsyResponse = {
    id: `aut_${Math.random().toString(36).slice(2, 10)}`,
    tradeId: `trd_${Math.random().toString(36).slice(2, 10)}`,
    score: 38,
    verdict: "Trapped on the wrong side of session liquidity.",
    summary:
      "Short opened directly into ASIA-session highs (67,612). The position filled on a liquidity sweep and reversed back into the 4H bullish order block.",
    improvement:
      "Wait for a 1H CHOCH below 67,500 before shorting from premium. Re-entry at 67,355 (top of 4H OB), stop above 67,612 sweep wick. Reduce size 4× until discipline > 70.",
    rebuyZone: "67,355 - 67,290 (4H OB)",
    flags: [
      { key: "revenge", label: "Revenge entry", tone: "red", confidence: 0.81 },
      { key: "liquidity_grab", label: "Liquidity grab", tone: "amber", confidence: 0.92 },
      { key: "premium_short", label: "Premium short", tone: "amber", confidence: 0.74 },
      { key: "trap_fill", label: "Trap fill", tone: "violet", confidence: 0.88 },
    ],
    concepts: [
      "liquidity-grab",
      "asia-high",
      "bos",
      "choch",
      "order-block",
      "fvg",
      "premium-discount",
      "inducement",
    ],
    createdAt: now,
  };

  // Echo the user-supplied context for parity with the eventual real impl.
  if (body.symbol || body.timeframe || body.direction) {
    response.ocr = { symbol: body.symbol, timeframe: body.timeframe, direction: body.direction };
  }

  return NextResponse.json(response, { status: 200 });
}
