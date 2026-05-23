/**
 * Live order placement.
 *
 * The 2FA consent gate works as follows:
 *   1. Client calls POST /api/exchange/order with order params
 *   2. If user.twoFactorOn && no valid consent token → 403 "2fa_required"
 *   3. Client presents TOTP dialog → sends back consent token
 *   4. Server verifies TOTP → issues a short-lived consent token (5 min)
 *   5. Client retries the order request with the consent header
 *   6. Server verifies the consent token and places the order
 *
 * This keeps live money gated behind a conscious "yes I want this" step.
 * Paper mode orders skip 2FA (no real funds at risk).
 */

import { createHmac, randomBytes } from "node:crypto";

// In-memory consent token store. In production, this would be Redis with
// TTL. For the v1 single-node deployment, a Map with manual expiry is fine.
// The tokens are opaque hex, keyed by userId.
const consentTokens = new Map<string, { token: string; expiresAt: number }>();

const CONSENT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Issue a consent token after successful 2FA verification.
 * Returns the token string to send back to the client.
 */
export function issueConsentToken(userId: string): string {
  const token = randomBytes(32).toString("hex");
  consentTokens.set(userId, { token, expiresAt: Date.now() + CONSENT_TTL_MS });
  return token;
}

/**
 * Validate a consent token. Returns true if valid and not expired.
 * Consumes the token (one-time use).
 */
export function validateConsentToken(userId: string, token: string): boolean {
  const entry = consentTokens.get(userId);
  if (!entry) return false;
  if (entry.token !== token) return false;
  if (Date.now() > entry.expiresAt) {
    consentTokens.delete(userId);
    return false;
  }
  // Consume — single use per order
  consentTokens.delete(userId);
  return true;
}

/**
 * TOTP verification.
 *
 * Standard TOTP: generate a 6-digit code from the user's stored secret,
 * with a 30-second window and ±1 step tolerance.
 */
export function verifyTotp(secret: string, code: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  const step = 30;

  for (const offset of [-1, 0, 1]) {
    const counter = Math.floor(now / step) + offset;
    const expected = generateTotp(secret, counter);
    if (expected === code) return true;
  }
  return false;
}

function generateTotp(secret: string, counter: number): string {
  // Counter as 8-byte big-endian
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  // Decode base32 secret manually (standard TOTP uses base32 encoding)
  const hmac = createHmac("sha1", decodeBase32(secret))
    .update(buf)
    .digest();

  const offset = hmac[hmac.length - 1]! & 0x0f;
  const truncated =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  return String(truncated % 1_000_000).padStart(6, "0");
}

/** Decode a base32 string (RFC 4648) into a Buffer. */
function decodeBase32(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const stripped = input.replace(/[=\s]/g, "").toUpperCase();
  const bits: number[] = [];
  for (const ch of stripped) {
    const val = alphabet.indexOf(ch);
    if (val < 0) continue;
    bits.push(val);
  }
  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;
  for (const val of bits) {
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bytes.push((buffer >> (bitsLeft - 8)) & 0xff);
      bitsLeft -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Order request shape. */
export interface OrderRequest {
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  quantity: number;
  price?: number; // required for LIMIT
  stopLoss?: number;
  takeProfit?: number;
}

/** Unified order response from any venue. */
export interface OrderResult {
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  quantity: number;
  filledPrice?: number;
  status: "FILLED" | "PENDING" | "REJECTED";
  message?: string;
}
