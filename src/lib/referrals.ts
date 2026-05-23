/**
 * Referrals — share code generation, attribution, stats.
 *
 * Flow:
 *   1. User opens /dashboard/referrals → we mint a code on first visit
 *      (lazy backfill so existing users self-heal).
 *   2. User shares /r/<code>. The /r/[code] route sets a 30-day
 *      first-touch attribution cookie and redirects to "/".
 *   3. New user signs up via Clerk.
 *   4. ensureDbUser() creates the User row, then claimReferralCookie()
 *      reads the cookie, finds the referrer, and inserts a Referral row.
 *      First-touch only — once attributed, subsequent code visits are
 *      ignored for that user.
 *   5. Reward logic (free month etc.) is reconciled when the referee
 *      converts to a paid plan — handled by the billing webhook.
 *
 * Rewards are intentionally simple in v1:
 *   - 3 paid referrals → 1 month OPERATOR credit (manual grant via admin)
 *   - 10 paid referrals → DESK lifetime
 * We surface counts + stats here; the actual credit-grant is admin-driven
 * for now (no auto-credit machinery — keeps the surface small).
 */

import { tryGetDb } from "./db";
import { logger } from "./logger";

const log = logger("referrals");

/** First-touch attribution cookie. 30 days. */
export const REFERRAL_COOKIE_NAME = "vx_ref";
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Generate a short, human-readable share code.
 *
 * 8 characters from an unambiguous alphabet (no 0/O/1/I/L) → 32^8 keyspace
 * (~1.1 trillion) which is more than enough for collision avoidance even
 * with millions of users. Caller retries on collision (rare).
 */
export function generateShareCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/**
 * Get-or-mint the user's personal share code. Idempotent.
 * Returns null in demo mode (caller should display a synthetic code).
 */
export async function ensureReferralCode(userId: string): Promise<string | null> {
  const db = tryGetDb();
  if (!db) return null;

  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  // Mint a new code. Retry on the (extremely rare) collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShareCode();
    try {
      await db.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
      return code;
    } catch (err) {
      const isDup = (err as { code?: string })?.code === "P2002";
      if (!isDup) throw err;
      // collision — try a different code
    }
  }
  log.error("Failed to mint unique referral code after 5 attempts", { userId });
  return null;
}

/**
 * Look up the referrer for a given share code.
 * Returns null when the code doesn't exist or DB is off.
 */
export async function findReferrerByCode(code: string): Promise<{ id: string } | null> {
  const db = tryGetDb();
  if (!db) return null;
  return db.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  });
}

/**
 * Attribute a newly-created user to the referrer encoded in their cookie.
 *
 * Called from `ensureDbUser` immediately after the User row is created
 * for the first time. Idempotent + first-touch — if a Referral row
 * already exists for this `toId`, we no-op rather than overwrite.
 *
 * `cookieValue` should be the raw cookie content (the share code).
 * Pass `null` if the cookie wasn't set.
 */
export async function claimReferralCookie(opts: {
  newUserId: string;
  cookieValue: string | null | undefined;
}): Promise<void> {
  if (!opts.cookieValue) return;
  const code = opts.cookieValue.trim().toUpperCase();
  if (!/^[A-Z2-9]{8}$/.test(code)) return;

  const db = tryGetDb();
  if (!db) return;

  const referrer = await findReferrerByCode(code);
  if (!referrer) {
    log.info("Referral code on cookie did not match any user", { code });
    return;
  }
  if (referrer.id === opts.newUserId) {
    // Self-referral — silently ignore. Happens if a user shares their
    // own link to themselves and creates a second account.
    return;
  }

  try {
    await db.referral.create({
      data: {
        fromId: referrer.id,
        toId: opts.newUserId,
        code,
        rewarded: false,
      },
    });
    log.info("Referral attributed", { fromId: referrer.id, toId: opts.newUserId, code });
  } catch (err) {
    // P2002 on `toId` unique → already attributed. First-touch wins; ignore.
    const isDup = (err as { code?: string })?.code === "P2002";
    if (!isDup) {
      log.error("Referral.create failed", { err: String(err) });
    }
  }
}

/**
 * Mark the referral for a paid-converting referee as rewarded. Called
 * from the billing webhook on first paid invoice. Idempotent.
 *
 * Returns true if a referral was newly marked rewarded (so the caller
 * can decide whether to send a "you earned a reward" notification).
 */
export async function markRefereeConverted(refereeUserId: string): Promise<boolean> {
  const db = tryGetDb();
  if (!db) return false;

  const result = await db.referral.updateMany({
    where: { toId: refereeUserId, rewarded: false },
    data: { rewarded: true, rewardedAt: new Date() },
  });
  return result.count > 0;
}

export interface ReferralStats {
  code: string | null;
  totalInvited: number;
  totalConverted: number;
  recentReferrals: Array<{
    createdAt: Date;
    rewarded: boolean;
    refereeDisplay: string; // first-letter-only for privacy
  }>;
}

/** Stats for the user's own referral page. */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const db = tryGetDb();
  if (!db) {
    return {
      code: "DEMO" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      totalInvited: 7,
      totalConverted: 3,
      recentReferrals: [
        {
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          rewarded: true,
          refereeDisplay: "k***",
        },
        {
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          rewarded: false,
          refereeDisplay: "n***",
        },
        {
          createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
          rewarded: true,
          refereeDisplay: "p***",
        },
      ],
    };
  }

  const [code, invited, converted, recent] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { referralCode: true } }),
    db.referral.count({ where: { fromId: userId } }),
    db.referral.count({ where: { fromId: userId, rewarded: true } }),
    db.referral.findMany({
      where: { fromId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        createdAt: true,
        rewarded: true,
        to: { select: { displayName: true, username: true, email: true } },
      },
    }),
  ]);

  return {
    code: code?.referralCode ?? null,
    totalInvited: invited,
    totalConverted: converted,
    recentReferrals: recent.map((r) => ({
      createdAt: r.createdAt,
      rewarded: r.rewarded,
      refereeDisplay: maskName(r.to.displayName ?? r.to.username ?? r.to.email),
    })),
  };
}

/** Show only the first character of an identifier — privacy on the share UI. */
function maskName(s: string | null): string {
  if (!s) return "***";
  const first = s.charAt(0).toLowerCase();
  return `${first}***`;
}
