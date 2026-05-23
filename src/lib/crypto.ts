/**
 * Application-layer encryption for sensitive credentials.
 *
 * Used to protect exchange API secrets at rest. The Postgres column
 * is a TEXT field; the value is the AEAD ciphertext envelope produced
 * here. This is defence-in-depth on top of disk encryption — even an
 * attacker with raw DB access cannot recover plaintext secrets without
 * also stealing `EXCHANGE_ENCRYPTION_KEY` from runtime env.
 *
 * Algorithm:
 *   AES-256-GCM
 *   12-byte random IV per record (NEVER reused with the same key)
 *   16-byte authentication tag
 *
 * Envelope format (string, colon-delimited base64):
 *   "v1:<iv_b64>:<tag_b64>:<ciphertext_b64>"
 *
 * The `v1:` prefix lets us migrate algorithms later without rewriting
 * every row at once.
 *
 * In demo / dev mode (no `EXCHANGE_ENCRYPTION_KEY` set) we fall back to
 * a plaintext envelope `"plain:<base64>"`. This keeps the connect flow
 * functional without requiring the developer to provision a key. The
 * format is intentionally distinguishable so prod code can refuse to
 * decrypt it at runtime.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./env";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** True when a real key is provisioned and we should refuse plaintext. */
export const encryptionConfigured = Boolean(env.exchange.encryptionKey);

function getKey(): Buffer | null {
  const raw = env.exchange.encryptionKey;
  if (!raw) return null;
  // Accept either base64 (preferred) or hex. Reject anything that doesn't
  // resolve to exactly 32 bytes — silently truncating would be worse than
  // a loud startup error.
  let buf: Buffer;
  if (/^[A-Fa-f0-9]+$/.test(raw) && raw.length === 64) {
    buf = Buffer.from(raw, "hex");
  } else {
    buf = Buffer.from(raw, "base64");
  }
  if (buf.length !== 32) {
    throw new Error(
      `EXCHANGE_ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length}). ` +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  return buf;
}

/**
 * Encrypt a plaintext secret. Safe to call with empty strings (returns
 * an envelope for an empty payload — useful for representing "no
 * passphrase configured" without nullable columns).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "encryption_unavailable: EXCHANGE_ENCRYPTION_KEY is required in production",
      );
    }
    // Dev/demo fallback. Distinguishable from real ciphertext.
    return `plain:${Buffer.from(plaintext, "utf8").toString("base64")}`;
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64"),
    tag.toString("base64"),
    ct.toString("base64"),
  ].join(":");
}

/** Decrypt an envelope produced by `encrypt`. Throws on tampered ciphertext. */
export function decrypt(envelope: string): string {
  if (envelope.startsWith("plain:")) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "encryption_mismatch: refusing to decrypt plaintext envelope in production",
      );
    }
    return Buffer.from(envelope.slice("plain:".length), "base64").toString("utf8");
  }

  const parts = envelope.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("encryption_format: expected v1:<iv>:<tag>:<ct>");
  }

  const key = getKey();
  if (!key) {
    throw new Error(
      "encryption_unavailable: stored ciphertext requires EXCHANGE_ENCRYPTION_KEY",
    );
  }

  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const ct = Buffer.from(parts[3], "base64");
  if (iv.length !== IV_BYTES) throw new Error("encryption_format: bad iv length");
  if (tag.length !== TAG_BYTES) throw new Error("encryption_format: bad tag length");

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** Mask a secret for log/UI display. Keeps the first 4 + last 4 chars. */
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 12) return "********";
  return `${plaintext.slice(0, 4)}…${plaintext.slice(-4)}`;
}
