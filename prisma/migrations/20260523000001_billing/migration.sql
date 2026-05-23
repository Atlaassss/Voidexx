-- Billing columns on User. Phase 4.
-- Stripe is the canonical identity for paying customers; these columns
-- let us reconcile inbound webhook events back to a User row without
-- depending on the email field (which can change).

ALTER TABLE "User"
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "subscriptionStatus" TEXT;

CREATE UNIQUE INDEX "User_stripeCustomerId_key"
  ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key"
  ON "User"("stripeSubscriptionId");
