-- Cache last-known balance + last error for ExchangeConnection.
-- Lets the automation page render instantly from DB without blocking
-- on a fresh BingX call, and surfaces probe failures back to the user.

ALTER TABLE "ExchangeConnection"
  ADD COLUMN "lastBalanceCents" BIGINT,
  ADD COLUMN "lastBalanceAt" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT;
