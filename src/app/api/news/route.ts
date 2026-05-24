import { NextResponse } from "next/server";
import { getNewsFeed, type NewsCategory, type NewsSource } from "@/lib/news";

export const runtime = "nodejs";
// Hourly cache aligns with the deterministic-per-hour rotation in
// getNewsFeed(). Vercel CDN serves the same payload to all viewers
// inside the bucket, easing load when many users hit the dashboard.
export const revalidate = 3600;

const VALID_MEDIUMS = new Set(["WIRE", "TV", "SOCIAL", "CRYPTO"]);
const VALID_SOURCES = new Set([
  "REUTERS",
  "BLOOMBERG",
  "BLOOMBERG_TV",
  "CNBC",
  "BBC",
  "AL_JAZEERA",
  "AP",
  "X_TWITTER",
  "COINDESK",
  "THE_BLOCK",
  "DECRYPT",
] as const);
const VALID_CATEGORIES = new Set([
  "MACRO",
  "FED",
  "CRYPTO",
  "FX",
  "EQUITY",
  "COMMODITY",
  "GEOPOLITICS",
  "ON_CHAIN",
] as const);

/**
 * GET /api/news
 *
 * Query parameters:
 *   - limit    : 1..50 (default 18)
 *   - category : MACRO | FED | CRYPTO | FX | EQUITY | COMMODITY | GEOPOLITICS | ON_CHAIN
 *   - source   : REUTERS | BLOOMBERG | CNBC | X_TWITTER | ...
 *   - medium   : WIRE | TV | SOCIAL | CRYPTO
 *
 * Auth: public — news doesn't need to be gated and the dashboard
 * shell + marketing surface both consume it. We still no-store on
 * the response so the per-hour rotation stays predictable from
 * client perspective.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const category = searchParams.get("category");
  const source = searchParams.get("source");
  const medium = searchParams.get("medium");

  const items = getNewsFeed({
    limit: Number.isFinite(limit) ? limit : undefined,
    category:
      category && VALID_CATEGORIES.has(category as NewsCategory)
        ? (category as NewsCategory)
        : undefined,
    source:
      source && VALID_SOURCES.has(source as NewsSource)
        ? (source as NewsSource)
        : undefined,
    medium: medium && VALID_MEDIUMS.has(medium) ? (medium as "WIRE" | "TV" | "SOCIAL" | "CRYPTO") : undefined,
  });

  return NextResponse.json(
    { items, generatedAt: new Date().toISOString() },
    {
      headers: {
        "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
