/**
 * Admin role gate + audit logging.
 *
 * `requireAdmin()` verifies the current session user has role ADMIN.
 * In demo mode it always passes (so the admin panel is previewable).
 *
 * `auditLog()` writes to AdminAuditLog. No-ops when DB is off.
 */

import { requireUser, type SessionUser } from "./auth";
import { tryGetDb } from "./db";
import { env } from "./env";

export interface AdminUser extends SessionUser {
  role: "ADMIN";
}

/**
 * Throws 401 if unauthenticated, 403 if not ADMIN.
 * In demo mode: returns the demo user with an admin "hat" so the UI
 * is fully explorable without config.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await requireUser();

  if (user.isDemo) {
    // Demo mode: let them explore admin pages without a real DB.
    return { ...user, role: "ADMIN" as const };
  }

  const db = tryGetDb();
  if (!db) {
    // No DB but not demo? Shouldn't happen — but fail open for local dev.
    return { ...user, role: "ADMIN" as const };
  }

  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!row || row.role !== "ADMIN") {
    throw new Response(
      JSON.stringify({ error: "forbidden", message: "Admin access required." }),
      { status: 403, headers: { "content-type": "application/json" } },
    );
  }

  return { ...user, role: "ADMIN" as const };
}

/**
 * Write an entry to the admin audit log.
 * Best-effort: never throws, just logs on failure.
 */
export async function auditLog(opts: {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const db = tryGetDb();
  if (!db) return;

  try {
    await db.adminAuditLog.create({
      data: {
        actorId: opts.actorId,
        action: opts.action,
        targetType: opts.targetType ?? null,
        targetId: opts.targetId ?? null,
        meta: opts.meta ? JSON.parse(JSON.stringify(opts.meta)) : undefined,
        ip: opts.ip ?? null,
        userAgent: opts.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("[admin] auditLog write failed", err);
  }
}

/**
 * Extract IP from request headers (Vercel + Cloudflare).
 */
export function getRequestIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    null
  );
}
