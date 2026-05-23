-- Lazy monthly reset for the free-tier autopsy quota.
-- Pairs with `User.freeUsageMonth`: every quota check that crosses a
-- month boundary atomically zeros the counter and bumps the period
-- start. No cron infrastructure required.

ALTER TABLE "User"
  ADD COLUMN "freeUsagePeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
