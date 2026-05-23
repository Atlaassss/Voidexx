/**
 * Prisma client singleton.
 *
 * Lazy-initialised so the app can boot without DATABASE_URL set
 * (demo mode). Callers should branch on `env.db.enabled` and use
 * `getDb()` only when persistence is required.
 */

import { PrismaClient } from "@prisma/client";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __voidexx_prisma: PrismaClient | undefined;
}

let _client: PrismaClient | null = null;

export function getDb(): PrismaClient {
  if (!env.db.enabled) {
    throw new Error(
      "Database is not configured. Set DATABASE_URL or branch on env.db.enabled.",
    );
  }
  if (global.__voidexx_prisma) return global.__voidexx_prisma;
  if (_client) return _client;

  _client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    global.__voidexx_prisma = _client;
  }
  return _client;
}

/** Optional helper for handlers that want to no-op when DB is off. */
export function tryGetDb(): PrismaClient | null {
  return env.db.enabled ? getDb() : null;
}
