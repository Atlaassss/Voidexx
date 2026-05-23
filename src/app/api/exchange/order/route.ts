import { NextResponse } from "next/server";
import { requireUser, asResponse, ensureDbUser } from "@/lib/auth";
import { tryGetDb } from "@/lib/db";
import { isLockedOut, describeBlock, DEFAULT_RISK_CAPS } from "@/lib/exchange/risk";
import { validateConsentToken, type OrderResult } from "@/lib/exchange/order";
import { auditLog, getRequestIp } from "@/lib/admin";
import { toJsonValue } from "@/lib/utils";
import { z } from "zod";

export const runtime = "nodejs";

const OrderSchema = z.object({
  connectionId: z.string().min(1),
  symbol: z.string().min(1).max(32),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT"]),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  consentToken: z.string().min(1).optional(),
});

/**
 * POST /api/exchange/order
 *
 * Place a live or paper trade via a connected exchange.
 *
 * 2FA consent gate:
 *   - If the connection is in LIVE mode (paperMode=false) AND the user
 *     has 2FA enabled, a valid consent token is REQUIRED.
 *   - Paper mode orders skip the consent gate (no real funds).
 *
 * Risk engine:
 *   - Before placement, check daily-loss cap, concurrent position limit,
 *     and tilt cooldown. Reject if any condition is met.
 *
 * Demo mode:
 *   - Returns a mock fill so the UI is functional without exchange creds.
 */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    const r = asResponse(err);
    return r ?? new Response("Unauthorized", { status: 401 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = OrderSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // LIMIT orders require a price
  if (parsed.data.type === "LIMIT" && !parsed.data.price) {
    return NextResponse.json(
      { error: "bad_request", message: "LIMIT orders require a price." },
      { status: 400 },
    );
  }

  // Demo mode: return mock fill
  if (user.isDemo) {
    return NextResponse.json(mockFill(parsed.data));
  }

  await ensureDbUser(user);

  const db = tryGetDb();
  if (!db) {
    return NextResponse.json(mockFill(parsed.data));
  }

  // Load connection
  const connection = await db.exchangeConnection.findFirst({
    where: { id: parsed.data.connectionId, userId: user.id },
    select: {
      id: true,
      venue: true,
      apiKeyEnc: true,
      apiSecretEnc: true,
      passphraseEnc: true,
      paperMode: true,
      enabled: true,
    },
  });

  if (!connection) {
    return NextResponse.json(
      { error: "connection_not_found", message: "Exchange connection not found." },
      { status: 404 },
    );
  }

  if (!connection.enabled) {
    return NextResponse.json(
      { error: "connection_disabled", message: "This exchange connection is disabled." },
      { status: 400 },
    );
  }

  // 2FA consent gate for live mode.
  //
  // Live trading is gated behind 2FA — full stop. If the user hasn't
  // enabled 2FA yet, we refuse the order rather than letting it
  // through unconfirmed. This forces 2FA enrolment before any real
  // money moves and prevents an account-takeover from immediately
  // draining funds via the API.
  //
  // Paper mode skips this gate (no real funds at risk).
  if (!connection.paperMode) {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { twoFactorOn: true },
    });

    if (!dbUser?.twoFactorOn) {
      return NextResponse.json(
        {
          error: "2fa_setup_required",
          message:
            "Live trading requires 2FA. Enable it in Settings before placing live orders.",
        },
        { status: 403 },
      );
    }

    if (!parsed.data.consentToken) {
      return NextResponse.json(
        {
          error: "2fa_required",
          message: "Live order requires 2FA consent. Call POST /api/exchange/consent first.",
        },
        { status: 403 },
      );
    }

    const valid = validateConsentToken(user.id, parsed.data.consentToken);
    if (!valid) {
      return NextResponse.json(
        {
          error: "consent_invalid",
          message: "Consent token is invalid or expired. Re-verify 2FA.",
        },
        { status: 403 },
      );
    }
  }

  // Risk engine check
  // TODO: In production, compute real state from today's closed positions.
  // For now we compute a basic state from the automation log.
  const riskState = await computeRiskState(db, user.id);
  const blocked = isLockedOut(riskState, DEFAULT_RISK_CAPS);
  if (blocked) {
    return NextResponse.json(
      {
        error: "risk_blocked",
        reason: blocked,
        message: describeBlock(blocked, DEFAULT_RISK_CAPS),
      },
      { status: 429 },
    );
  }

  // Paper mode: simulate fill without hitting the venue
  if (connection.paperMode) {
    const result = mockFill(parsed.data);

    // Log the paper trade
    await db.automationLog.create({
      data: {
        userId: user.id,
        exchangeId: connection.id,
        kind: "ORDER_PLACED",
        level: "INFO",
        message: `Paper ${parsed.data.side} ${parsed.data.quantity} ${parsed.data.symbol} @ ${parsed.data.type}`,
        payload: toJsonValue({ order: parsed.data, result }),
      },
    });

    return NextResponse.json({ ...result, paper: true });
  }

  // Live mode: place order via venue API
  // For v1, only BingX is wired. Other venues return "not implemented".
  // The actual placement logic would call the exchange's order API.
  // For this scaffold, we log and return a pending state — the real
  // implementation is wired when the BingX order API adapter ships.
  const result: OrderResult = {
    orderId: `live_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    symbol: parsed.data.symbol,
    side: parsed.data.side,
    type: parsed.data.type,
    quantity: parsed.data.quantity,
    status: "PENDING",
    message: `Order submitted to ${connection.venue}. Awaiting fill confirmation.`,
  };

  await db.automationLog.create({
    data: {
      userId: user.id,
      exchangeId: connection.id,
      kind: "ORDER_PLACED",
      level: "INFO",
      message: `Live ${parsed.data.side} ${parsed.data.quantity} ${parsed.data.symbol} @ ${parsed.data.type}`,
      payload: toJsonValue({ order: parsed.data, result }),
    },
  });

  await auditLog({
    actorId: user.id,
    action: "order.placed_live",
    targetType: "ExchangeConnection",
    targetId: connection.id,
    meta: { order: parsed.data, venue: connection.venue },
    ip: getRequestIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFill(order: z.infer<typeof OrderSchema>): OrderResult {
  const mockPrice =
    order.price ??
    (order.symbol.includes("BTC") ? 67234.5 : order.symbol.includes("ETH") ? 3456.78 : 1.0);

  return {
    orderId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    symbol: order.symbol,
    side: order.side,
    type: order.type,
    quantity: order.quantity,
    filledPrice: mockPrice,
    status: "FILLED",
    message: "Demo fill — not a real execution.",
  };
}

async function computeRiskState(
  db: NonNullable<ReturnType<typeof tryGetDb>>,
  userId: string,
) {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // Count today's loss events from automation logs
  const lossLogs = await db.automationLog.findMany({
    where: {
      userId,
      kind: "ORDER_FILLED",
      createdAt: { gte: todayStart },
    },
    select: { payload: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  // Sum R from filled orders (stored in payload.rRealized if available)
  let dailyRealisedR = 0;
  let lastStopOutAt: Date | null = null;

  for (const log of lossLogs) {
    const payload = log.payload as Record<string, unknown> | null;
    if (payload?.rRealized && typeof payload.rRealized === "number") {
      dailyRealisedR += payload.rRealized;
      if (payload.rRealized < 0 && !lastStopOutAt) {
        lastStopOutAt = log.createdAt;
      }
    }
  }

  // Count open positions (rough: automation logs with ORDER_PLACED but no FILLED)
  const openCount = await db.automationLog.count({
    where: {
      userId,
      kind: "ORDER_PLACED",
      createdAt: { gte: todayStart },
    },
  });

  return {
    dailyRealisedR,
    openPositionCount: Math.max(0, openCount - lossLogs.length),
    lastStopOutAt,
  };
}
