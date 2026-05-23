import { NextResponse } from "next/server";
import { requireUser, asResponse, ensureDbUser } from "@/lib/auth";
import { tryGetDb } from "@/lib/db";
import { issueConsentToken, verifyTotp } from "@/lib/exchange/order";
import { z } from "zod";

export const runtime = "nodejs";

const ConsentSchema = z.object({
  totpCode: z.string().length(6).regex(/^\d{6}$/),
});

/**
 * POST /api/exchange/consent
 *
 * Verify TOTP and issue a short-lived consent token for order placement.
 *
 * Flow:
 *   1. User enters 6-digit TOTP from their authenticator
 *   2. We verify against their stored 2FA secret
 *   3. Issue a 5-minute single-use consent token
 *   4. Client attaches this token on the next order request
 *
 * Demo mode: always issues a consent token (no real 2FA verification).
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
  const parsed = ConsentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", message: "Provide a 6-digit TOTP code." },
      { status: 400 },
    );
  }

  // Demo mode: skip real verification, issue token immediately
  if (user.isDemo) {
    const token = issueConsentToken(user.id);
    return NextResponse.json({ ok: true, token, expiresInSeconds: 300, demo: true });
  }

  await ensureDbUser(user);

  const db = tryGetDb();
  if (!db) {
    // No DB: issue demo consent
    const token = issueConsentToken(user.id);
    return NextResponse.json({ ok: true, token, expiresInSeconds: 300, demo: true });
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { twoFactorOn: true, twoFactorSecret: true },
  });

  if (!dbUser?.twoFactorOn || !dbUser.twoFactorSecret) {
    // 2FA not enabled: issue consent without TOTP verification.
    // The order route still gates on paper vs live mode.
    const token = issueConsentToken(user.id);
    return NextResponse.json({ ok: true, token, expiresInSeconds: 300 });
  }

  // Verify TOTP
  const valid = verifyTotp(dbUser.twoFactorSecret, parsed.data.totpCode);
  if (!valid) {
    return NextResponse.json(
      { error: "invalid_totp", message: "Invalid or expired TOTP code. Try again." },
      { status: 401 },
    );
  }

  const token = issueConsentToken(user.id);
  return NextResponse.json({ ok: true, token, expiresInSeconds: 300 });
}
