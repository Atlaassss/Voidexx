-- Phase 8 — share links + admin actions.
--
-- Adds:
--   * Autopsy.shareId          (unique, nullable)
--   * Autopsy.shareEnabled     boolean default false
--   * User.bonusAutopsies      int default 0   (admin-granted credits)
--   * User.suspendedAt         nullable timestamp
--   * User.suspendedReason     nullable text
--
-- All columns nullable / default 0/false — no data migration required.
-- Idempotent IF NOT EXISTS guards so re-running on partial state is safe.

ALTER TABLE "Autopsy"
  ADD COLUMN IF NOT EXISTS "shareId"      TEXT,
  ADD COLUMN IF NOT EXISTS "shareEnabled" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'Autopsy_shareId_key'
  ) THEN
    CREATE UNIQUE INDEX "Autopsy_shareId_key" ON "Autopsy"("shareId");
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "bonusAutopsies"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "suspendedAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT;
