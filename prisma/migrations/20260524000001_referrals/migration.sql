-- AlterTable: User gets a personal share code
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AlterTable: Referral row gains a rewardedAt timestamp and one-attribution-per-invitee constraint
--
-- IMPORTANT: this migration assumes the Referral table is empty when
-- it runs. The Referral model existed in the Phase-1 schema but no
-- code path actually inserts into it before Phase 7 — fresh deploys
-- and existing dev databases all start with zero rows.
--
-- If a brownfield deploy somehow has rows where the same `toId`
-- appears across multiple `fromId`s (impossible to insert via the old
-- code, but possible to seed manually), the CREATE UNIQUE INDEX on
-- `toId` below will fail. Resolution in that case: dedupe by keeping
-- the oldest Referral per toId before re-running migrate deploy.

-- Drop the old (fromId, toId) composite unique — first-touch wins now,
-- so toId alone is the natural key.
ALTER TABLE "Referral" DROP CONSTRAINT IF EXISTS "Referral_fromId_toId_key";
DROP INDEX IF EXISTS "Referral_fromId_toId_key";

-- New per-invitee uniqueness — toId can appear at most once across all referrals.
CREATE UNIQUE INDEX "Referral_toId_key" ON "Referral"("toId");

-- Drop the old code unique — codes are now the referrer's personal share code,
-- which is reused across multiple invitees. The User.referralCode UNIQUE above
-- is the actual uniqueness constraint.
ALTER TABLE "Referral" DROP CONSTRAINT IF EXISTS "Referral_code_key";
DROP INDEX IF EXISTS "Referral_code_key";

-- Indexes for the analytics queries (referrer leaderboard, code lookups).
CREATE INDEX "Referral_fromId_createdAt_idx" ON "Referral"("fromId", "createdAt");
CREATE INDEX "Referral_code_idx" ON "Referral"("code");

-- New rewardedAt column.
ALTER TABLE "Referral" ADD COLUMN "rewardedAt" TIMESTAMP(3);
