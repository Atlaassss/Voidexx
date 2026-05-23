/**
 * Authentication façade.
 *
 * `getSessionUser()` resolves to:
 *   - the Clerk-authenticated user when Clerk is configured
 *   - a deterministic DEMO user when running unconfigured (lets the
 *     dashboard work locally for previews)
 *
 * Route handlers should prefer `requireUser()` which throws a 401
 * Response when no session exists and Clerk is configured.
 *
 * `ensureDbUser()` lazily upserts a `User` row on first authenticated
 * touch. This is needed because Clerk owns the identity but Postgres
 * owns the FK constraints (Trade.userId, Autopsy.userId, Payment.userId).
 * Without this, a freshly-signed-up Clerk user would be locked out of
 * their own free tier on first request because `findUnique({where:{id}})`
 * returns null. A future Clerk webhook can do this earlier; until then,
 * lazy upsert is safe and idempotent.
 */

import { env } from "./env";
import { tryGetDb } from "./db";

export interface SessionUser {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  imageUrl: string | null;
  isDemo: boolean;
}

const DEMO_USER: SessionUser = {
  id: "demo_user_kx",
  email: "kx@voidexx.io",
  username: "kx.haunter",
  displayName: "kx.haunter",
  imageUrl: null,
  isDemo: true,
};

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!env.clerk.enabled) return DEMO_USER;

  // Dynamic import so we don't pay the Clerk runtime cost in demo mode
  // and so the build doesn't try to evaluate Clerk env at module load.
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return { id: userId, email: null, username: null, displayName: null, imageUrl: null, isDemo: false };

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    user.primaryEmailAddress?.emailAddress ||
    null;

  return {
    id: userId,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    username: user.username,
    displayName,
    imageUrl: user.imageUrl ?? null,
    isDemo: false,
  };
}

/**
 * For server actions / route handlers. Throws a Response so callers can
 * `try { ... } catch (e) { if (e instanceof Response) return e; ... }`.
 */
export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) {
    throw new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return u;
}

/**
 * In-process cache of Clerk user ids that have already been mirrored to
 * the Postgres `User` table during this server lifecycle. Resets on cold
 * start, which is fine: re-running an idempotent upsert is cheap. The
 * cache exists purely to keep the hot path (every authenticated request)
 * from issuing a redundant `UPSERT` on subsequent calls.
 *
 * NOTE: in a multi-instance deployment each instance maintains its own
 * cache. This is correct — at worst one upsert per instance per user.
 */
const _syncedUsers = new Set<string>();

/**
 * Idempotent upsert of a Clerk-authenticated user into the `User` table.
 *
 * Call this from any route that's about to write a row whose FK points
 * at `User.id` (Trade, Autopsy, Payment, ExchangeConnection, ...).
 * No-ops when:
 *   - `env.db.enabled` is false (demo mode)
 *   - the user is the deterministic demo session
 *   - we've already synced this id during this process lifetime
 */
export async function ensureDbUser(user: SessionUser): Promise<void> {
  if (!env.db.enabled) return;
  if (user.isDemo) return;
  if (_syncedUsers.has(user.id)) return;

  const db = tryGetDb();
  if (!db) return;

  try {
    await db.user.upsert({
      where: { id: user.id },
      // Update is intentionally minimal — we only want to keep contact info
      // fresh when Clerk has it. Plan/usage/preferences are owned by the app.
      update: {
        ...(user.email != null && { email: user.email }),
        ...(user.username != null && { username: user.username }),
        ...(user.displayName != null && { displayName: user.displayName }),
      },
      create: {
        id: user.id,
        // Postgres requires email NOT NULL + unique. Fall back to a synthetic
        // value when Clerk somehow has no email yet (rare, but possible
        // mid-onboarding). The synthetic form is unique per user id.
        email: user.email ?? `${user.id}@no-email.voidexx.local`,
        username: user.username ?? null,
        displayName: user.displayName ?? null,
      },
    });
    _syncedUsers.add(user.id);
  } catch (err) {
    // Don't break the request flow on a sync failure — log and continue.
    // Downstream FK-dependent writes will surface a more specific error
    // if this ever fails for a reason other than transient DB issues.
    console.error("[auth] ensureDbUser failed", err);
  }
}

/**
 * Helper: convert any thrown Response into a real Response, otherwise rethrow.
 * Use inside `catch (e)` of route handlers.
 */
export function asResponse(err: unknown): Response | null {
  return err instanceof Response ? err : null;
}
