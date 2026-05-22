import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/exchange/connect
 *
 * body: { venue, apiKey, apiSecret, passphrase?, paperMode }
 *
 * SECURITY NOTES:
 *  - never log raw secrets
 *  - encrypt with KMS-derived AEAD before persistence
 *  - smoke-test the credential server-side (read-only) before saving
 *  - reject "withdraw" scope keys
 */
export async function POST() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
