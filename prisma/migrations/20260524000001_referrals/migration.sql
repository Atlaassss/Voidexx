-- AlterTable: User gets a personal share code
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AlterTable: Referral row gains a rewardedAt timestamp and one-attribution-per-invitee constraint
-- Drop the old (fromId, toId) composite unique — it allowed re-inviting the same user
-- across cooldowns; the product policy is "one attribution ever per invitee".
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
