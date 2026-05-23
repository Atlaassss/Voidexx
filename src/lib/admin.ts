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
import { toJsonValue } from "./utils";

export interface AdminUser extends SessionUser {
  role: "ADMIN";
}

/**
 * Throws 401 if unauthenticated, 403 if not ADMIN, 503 if DB unavailable
 * but Clerk is configured (we can't verify the role, so we refuse).
 *
 * In demo mode (Clerk not configured): returns the demo user with an
 * admin "hat" so the UI is fully explorable without config. This is
 * safe because demo mode never persists writes — the admin panel can
 * be browsed but not used to mutate real data.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await requireUser();

  if (user.isDemo) {
    // Demo mode: let them explore admin pages without a real DB.
    return { ...user, role: "ADMIN" as const };
  }

  const db = tryGetDb();
  if (!db) {
    // Clerk-authenticated but no DB. We can't verify the role, so we
    // refuse rather than fail open. A misconfigured production deploy
    // (DATABASE_URL accidentally cleared) must NOT grant admin access
    // to every signed-in user.
    throw new Response(
      JSON.stringify({
        error: "admin_unavailable",
        message:
          "Admin panel requires a configured database to verify role.",
      }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
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
        meta: opts.meta ? toJsonValue(opts.meta) : undefined,
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
