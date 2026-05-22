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
 */

import { env } from "./env";

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
 * Helper: convert any thrown Response into a real Response, otherwise rethrow.
 * Use inside `catch (e)` of route handlers.
 */
export function asResponse(err: unknown): Response | null {
  return err instanceof Response ? err : null;
}
