import { NextResponse } from "next/server";
import { requireUser, asResponse, ensureDbUser } from "@/lib/auth";
import { ensureReferralCode, getReferralStats } from "@/lib/referrals";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * GET /api/referrals/me
 *
 * Returns the current user's referral code, share URL, and stats.
 * Mints the code on first call so existing users self-heal.
 *
 * Demo mode: returns deterministic mock code + mock stats so the
 * dashboard renders fully without a DB.
 */
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    const r = asResponse(err);
    return r ?? new Response("Unauthorized", { status: 401 });
  }

  // Lazy mirror so the FK on Referral is guaranteed to resolve.
  await ensureDbUser(user);

  // ensureReferralCode no-ops in demo mode and returns null;
  // getReferralStats supplies a synthetic code in that case.
  await ensureReferralCode(user.id);
  const stats = await getReferralStats(user.id);

  const code = stats.code;
  const shareUrl = code ? `${env.app.url}/r/${code}` : null;

  return NextResponse.json({
    code,
    shareUrl,
    totalInvited: stats.totalInvited,
    totalConverted: stats.totalConverted,
    recentReferrals: stats.recentReferrals.map((r) => ({
      createdAt: r.createdAt.toISOString(),
      rewarded: r.rewarded,
      refereeDisplay: r.refereeDisplay,
    })),
    // Reward tiers — UI displays a progress bar against these.
    tiers: [
      { count: 3, reward: "1 month OPERATOR free" },
      { count: 10, reward: "DESK lifetime" },
      { count: 25, reward: "Affiliate program invite" },
    ],
    demo: user.isDemo || code?.startsWith("DEMO") || false,
  });
}
