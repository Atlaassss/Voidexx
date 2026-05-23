-- Phase 7.1 — PayMongo billing rail.
--
-- Adds:
--   * PaymentProvider.PAYMONGO         enum value
--   * User.paymongoIntentId            unique, nullable
--   * User.paymongoIntentExpires       nullable timestamp
--
-- Idempotent — uses IF NOT EXISTS guards so re-running on a partially
-- migrated database is safe.

-- 1. Extend the PaymentProvider enum with PAYMONGO.
--
-- Postgres enum extension can't run inside a transaction in older
-- versions; the migration is split into a single ALTER TYPE which
-- Prisma's migrate engine wraps appropriately. The IF NOT EXISTS guard
-- (Postgres 9.6+) makes the statement idempotent.
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'PAYMONGO';

-- 2. Add the two new User columns. Both are nullable so the migration
-- is non-breaking on existing rows.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "paymongoIntentId"      TEXT,
  ADD COLUMN IF NOT EXISTS "paymongoIntentExpires" TIMESTAMP(3);

-- 3. Unique index on paymongoIntentId. Created CONCURRENTLY-ish via the
-- standard Prisma path (Prisma's migrate engine does not support
-- CONCURRENTLY natively, so we accept a brief table lock — the User
-- table is small enough that it's fine).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'User_paymongoIntentId_key'
  ) THEN
    CREATE UNIQUE INDEX "User_paymongoIntentId_key" ON "User"("paymongoIntentId");
  END IF;
END $$;
