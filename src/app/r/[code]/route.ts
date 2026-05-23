import { NextResponse, type NextRequest } from "next/server";
import {
  REFERRAL_COOKIE_NAME,
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/referrals";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /r/<code>
 *
 * Public referral redirector.
 *
 * Sets a 30-day first-touch attribution cookie keyed on the share code,
 * then 302's to "/" (or the optional `?to=/path` redirect target).
 *
 * The cookie is HTTPOnly + SameSite=Lax + Secure (in prod). It's read
 * later by `ensureDbUser` via Next's `cookies()` helper after the user
 * signs up, and an attribution row is written.
 *
 * Validation:
 *   - Code shape must match the share-code alphabet/length (8 chars,
 *     unambiguous alphabet). Garbage codes 404 rather than getting
 *     stamped as a cookie that will silently never match.
 *   - `?to` is restricted to same-origin paths; cross-origin redirects
 *     are dropped to avoid an open-redirect vector.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  if (!/^[A-Z2-9]{8}$/.test(code)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Optional same-origin redirect target. Default to root.
  const reqUrl = new URL(req.url);
  const toParam = reqUrl.searchParams.get("to");
  const safeTo =
    toParam && toParam.startsWith("/") && !toParam.startsWith("//") ? toParam : "/";

  const target = new URL(safeTo, env.app.url);

  const res = NextResponse.redirect(target, { status: 302 });
  res.cookies.set({
    name: REFERRAL_COOKIE_NAME,
    value: code,
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
