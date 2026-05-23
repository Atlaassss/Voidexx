import { NextResponse } from "next/server";
import { requireUser, asResponse, ensureDbUser } from "@/lib/auth";
import { ExchangeConnectSchema, badRequest } from "@/lib/validation";
import { tryGetDb } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { clientFor } from "@/lib/exchange/registry";
import type { Venue } from "@prisma/client";

export const runtime = "nodejs";

/**
 * POST /api/exchange/connect
 *
 * body: { venue, apiKey, apiSecret, passphrase?, paperMode? }
 *
 * Flow:
 *   1. Auth + zod-validate
 *   2. Look up the venue's client adapter (BINGX is the only one wired in v1)
 *   3. Probe the credentials with a read-only call (getBalance) BEFORE
 *      persisting anything. If the venue rejects them we don't store
 *      garbage — return a 400 with a specific reason.
 *   4. Encrypt secrets via lib/crypto and upsert the ExchangeConnection row
 *   5. Return the connection id + venue + cached usdTotal
 *
 * Demo mode (no DB): the connect flow still works visually because the
 * automation page falls back to a mocked venue list. We refuse to persist
 * here so the user gets a clear message instead of a silent no-op.
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
  const parsed = ExchangeConnectSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error);

  const venue = parsed.data.venue as Venue;
  const adapter = clientFor(venue);
  if (!adapter) {
    return NextResponse.json(
      {
        error: "venue_not_supported",
        message: `${venue} is on the roadmap but not wired yet. Use BINGX for v1.`,
      },
      { status: 400 },
    );
  }

  // Probe FIRST. We don't want to persist a known-bad credential.
  const probe = await adapter.probe({
    apiKey: parsed.data.apiKey,
    apiSecret: parsed.data.apiSecret,
    passphrase: parsed.data.passphrase,
  });
  if (!probe.ok) {
    return NextResponse.json(
      {
        error: "probe_failed",
        reason: probe.reason,
        message:
          probe.reason === "auth_failed"
            ? "BingX rejected those credentials. Double-check the API key + secret and that read scope is enabled."
            : probe.reason === "rate_limited"
              ? "BingX is rate-limiting our probe. Wait a moment and try again."
              : "Could not reach the venue. Check your network or try again in a minute.",
      },
      { status: 400 },
    );
  }

  // Pull a real balance to seed the cache. We just probed so it's hot;
  // doing a second call is wasteful. Fetch once and reuse.
  const balance = await adapter
    .getBalance({
      apiKey: parsed.data.apiKey,
      apiSecret: parsed.data.apiSecret,
      passphrase: parsed.data.passphrase,
    })
    .catch(() => null);

  // Mirror the Clerk identity into Postgres before any FK-bearing write.
  await ensureDbUser(user);

  const db = tryGetDb();
  if (!db || user.isDemo) {
    // Demo mode: probe succeeded (or returned mock OK), but we won't
    // persist. Tell the client so the UI can show a non-misleading
    // success-but-ephemeral state.
    return NextResponse.json({
      ok: true,
      demo: true,
      venue,
      usdTotal: balance?.usdTotal ?? 0,
      message: "Probe succeeded. Set DATABASE_URL + EXCHANGE_ENCRYPTION_KEY to persist this connection.",
    });
  }

  const apiKeyEnc = encrypt(parsed.data.apiKey);
  const apiSecretEnc = encrypt(parsed.data.apiSecret);
  const passphraseEnc = parsed.data.passphrase ? encrypt(parsed.data.passphrase) : null;
  const usdCents = balance ? Math.round(balance.usdTotal * 100) : null;
  const now = new Date();

  // Upsert by (userId, venue) — at most one connection per venue per user.
  // Reconnecting with a fresh key replaces the old encrypted blob.
  const row = await db.exchangeConnection.upsert({
    where: { userId_venue: { userId: user.id, venue } },
    update: {
      apiKeyEnc,
      apiSecretEnc,
      passphraseEnc,
      paperMode: parsed.data.paperMode,
      enabled: true,
      lastCheck: now,
      lastBalanceCents: usdCents != null ? BigInt(usdCents) : null,
      lastBalanceAt: usdCents != null ? now : null,
      lastError: null,
    },
    create: {
      userId: user.id,
      venue,
      apiKeyEnc,
      apiSecretEnc,
      passphraseEnc,
      scopes: ["read"],
      paperMode: parsed.data.paperMode,
      enabled: true,
      lastCheck: now,
      lastBalanceCents: usdCents != null ? BigInt(usdCents) : null,
      lastBalanceAt: usdCents != null ? now : null,
    },
    select: { id: true, venue: true, paperMode: true, lastBalanceCents: true },
  });

  return NextResponse.json({
    ok: true,
    id: row.id,
    venue: row.venue,
    paperMode: row.paperMode,
    usdTotal: balance?.usdTotal ?? 0,
  });
}
