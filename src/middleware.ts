import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = createRouteMatcher([
  "/dashboard(.*)",
  "/api/autopsy(.*)",
  "/api/uploads(.*)",
  "/api/trades(.*)",
  "/api/billing/checkout(.*)",
  "/api/exchange(.*)",
]);

const CLERK_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

/**
 * When Clerk is configured, protected routes require a valid session.
 * When Clerk is NOT configured (demo mode), the middleware no-ops so the
 * dashboard is reachable for previews. The `getSessionUser()` helper
 * still returns a deterministic demo identity in that mode.
 *
 * IMPORTANT: We branch at module-level rather than inside the
 * clerkMiddleware handler. Clerk validates the publishable key inside its
 * wrapper before our handler runs, so an inner if-check throws regardless.
 * Returning a plain noop function in demo mode bypasses Clerk entirely.
 */
const realMiddleware = clerkMiddleware(async (auth, req: NextRequest) => {
  if (PROTECTED(req)) await auth.protect();
});

const demoMiddleware = (_req: NextRequest) => NextResponse.next();

export default CLERK_ENABLED ? realMiddleware : demoMiddleware;

export const config = {
  matcher: [
    // Skip Next.js internals and all static assets.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
