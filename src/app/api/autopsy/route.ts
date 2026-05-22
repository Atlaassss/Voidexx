import { NextResponse } from "next/server";
import { requireUser, asResponse } from "@/lib/auth";
import { AutopsyRequestSchema, badRequest } from "@/lib/validation";
import { checkAndIncrementQuota } from "@/lib/quota";
import { tryGetDb } from "@/lib/db";
import type { AutopsyResponse } from "@/lib/api/contracts";

export const runtime = "nodejs";

/**
 * POST /api/autopsy
 *
 * Phase 2 wiring:
 *  1. requireUser  — Clerk session (or demo)
 *  2. zod-validate body
 *  3. quota check  — RECON tier hard-cap of 5/month
 *  4. (DB on) persist Trade + Autopsy with the deterministic mock
 *  5. return AutopsyResponse
 *
 * The verdict body itself is still mocked — Phase 3 swaps it for the
 * real vision + structure pipeline. Persistence and contracts are now
 * real, so the swap is a single function call.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const json = await req.json().catch(() => ({}));
    const parsed = AutopsyRequestSchema.safeParse(json);
    if (!parsed.success) return badRequest(parsed.error);

    const quota = await checkAndIncrementQuota(user.id);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          plan: quota.plan,
          used: quota.used,
          limit: quota.limit,
          message: "Free tier autopsies exhausted for this month. Upgrade to Operator.",
        },
        { status: 402 },
      );
    }

    const response: AutopsyResponse = {
      id: `aut_${randomId()}`,
      tradeId: `trd_${randomId()}`,
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
      createdAt: new Date().toISOString(),
    };

    if (parsed.data.symbol || parsed.data.timeframe || parsed.data.direction) {
      response.ocr = {
        symbol: parsed.data.symbol,
        timeframe: parsed.data.timeframe,
        direction: parsed.data.direction,
      };
    }

    // Persist when DB is available. Best-effort — failures shouldn't
    // break the user-facing autopsy; we log and continue.
    const db = tryGetDb();
    if (db && !user.isDemo) {
      try {
        const trade = await db.trade.create({
          data: {
            id: response.tradeId,
            userId: user.id,
            symbol: parsed.data.symbol ?? "BTCUSDT",
            timeframe: parsed.data.timeframe ?? "1H",
            direction: parsed.data.direction ?? "SHORT",
            entry: 67_612.4,
            stop: 67_790.1,
            target: 66_840.0,
            rPlanned: 4.3,
            rRealized: -4.2,
            outcome: "LOSS",
            openedAt: new Date(),
            closedAt: new Date(),
            screenshotUrl: null,
            tags: ["asia-high", "liquidity-grab"],
            notes: parsed.data.notes ?? null,
          },
        });
        await db.autopsy.create({
          data: {
            id: response.id,
            tradeId: trade.id,
            userId: user.id,
            score: response.score,
            verdict: response.verdict,
            summary: response.summary,
            improvement: response.improvement,
            rebuyZone: response.rebuyZone ?? null,
            flags: response.flags.map((f) => f.key),
            concepts: response.concepts,
          },
        });
      } catch (e) {
        console.error("[autopsy] persistence failed", e);
      }
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "x-quota-used": String(quota.used),
        "x-quota-limit": String(quota.limit),
      },
    });
  } catch (err) {
    const r = asResponse(err);
    if (r) return r;
    console.error("[autopsy] failed", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}
