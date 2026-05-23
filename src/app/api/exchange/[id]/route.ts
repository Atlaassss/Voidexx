import { NextResponse } from "next/server";
import { requireUser, asResponse } from "@/lib/auth";
import { tryGetDb } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { clientFor } from "@/lib/exchange/registry";

export const runtime = "nodejs";

/**
 * GET /api/exchange/:id
 *   → refresh balance + positions for a connected exchange.
 * DELETE /api/exchange/:id
 *   → revoke (sets enabled=false; keeps the row so AutomationLog FK
 *     and historical Payment audit trails remain intact).
 *
 * Both are owner-checked: a row's userId must match the authenticated
 * user or we 404 to avoid leaking row existence to other tenants.
 */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    const r = asResponse(err);
    return r ?? new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;

  const db = tryGetDb();
  if (!db) {
    return NextResponse.json({ error: "not_found", reason: "demo_mode" }, { status: 404 });
  }

  const row = await db.exchangeConnection.findUnique({ where: { id } });
  if (!row || row.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!row.enabled) {
    return NextResponse.json({ error: "disabled" }, { status: 410 });
  }

  const adapter = clientFor(row.venue);
  if (!adapter) {
    return NextResponse.json({ error: "venue_not_supported" }, { status: 503 });
  }

  let creds;
  try {
    creds = {
      apiKey: decrypt(row.apiKeyEnc),
      apiSecret: decrypt(row.apiSecretEnc),
      passphrase: row.passphraseEnc ? decrypt(row.passphraseEnc) : undefined,
    };
  } catch (err) {
    console.error("[exchange/get] decrypt failed", err);
    return NextResponse.json({ error: "decrypt_failed" }, { status: 500 });
  }

  try {
    const [balance, positions] = await Promise.all([
      adapter.getBalance(creds),
      adapter.getOpenPositions(creds),
    ]);
    const now = new Date();
    const usdCents = Math.round(balance.usdTotal * 100);
    await db.exchangeConnection.update({
      where: { id },
      data: {
        lastCheck: now,
        lastBalanceCents: BigInt(usdCents),
        lastBalanceAt: now,
        lastError: null,
      },
    });
    return NextResponse.json({
      id: row.id,
      venue: row.venue,
      paperMode: row.paperMode,
      usdTotal: balance.usdTotal,
      positions,
      refreshedAt: now.toISOString(),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    await db.exchangeConnection.update({
      where: { id },
      data: { lastError: reason.slice(0, 500), lastCheck: new Date() },
    });
    return NextResponse.json({ error: "venue_call_failed", reason }, { status: 502 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    const r = asResponse(err);
    return r ?? new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;

  const db = tryGetDb();
  if (!db) return NextResponse.json({ ok: true, demo: true });

  const row = await db.exchangeConnection.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!row || row.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await db.exchangeConnection.update({
    where: { id },
    data: {
      enabled: false,
      // Wipe encrypted secrets on revoke. Even if EXCHANGE_ENCRYPTION_KEY
      // were later compromised, an old revoked connection wouldn't yield
      // anything useful.
      apiKeyEnc: "",
      apiSecretEnc: "",
      passphraseEnc: null,
    },
  });
  return NextResponse.json({ ok: true });
}
