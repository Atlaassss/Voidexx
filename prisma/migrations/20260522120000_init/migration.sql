-- VOIDEXX initial schema migration.
-- Generated to match prisma/schema.prisma. Apply with `prisma migrate deploy`.

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPPORT');
CREATE TYPE "Plan" AS ENUM ('RECON', 'OPERATOR', 'DESK');
CREATE TYPE "Market" AS ENUM ('CRYPTO', 'FOREX', 'INDICES', 'COMMODITIES', 'STOCKS');
CREATE TYPE "Direction" AS ENUM ('LONG', 'SHORT');
CREATE TYPE "Outcome" AS ENUM ('OPEN', 'WIN', 'LOSS', 'BREAKEVEN', 'CANCELLED');
CREATE TYPE "Venue" AS ENUM ('BINGX', 'BINANCE', 'BYBIT', 'OKX', 'KUCOIN', 'MT5');
CREATE TYPE "AutomationKind" AS ENUM ('ORDER_PLACED', 'ORDER_CANCELLED', 'ORDER_FILLED', 'RISK_CAP_HIT', 'STRATEGY_TOGGLED', 'DAILY_LOSS_LOCKOUT', 'TILT_LOCKOUT');
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYPAL', 'GCASH', 'MAYA');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "passwordHash" TEXT,
    "twoFactorSecret" TEXT,
    "twoFactorOn" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "plan" "Plan" NOT NULL DEFAULT 'RECON',
    "planRenewsAt" TIMESTAMP(3),
    "freeUsageMonth" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_plan_idx" ON "User"("plan");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "market" "Market" NOT NULL DEFAULT 'CRYPTO',
    "timeframe" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "entry" DECIMAL(20,8) NOT NULL,
    "stop" DECIMAL(20,8),
    "target" DECIMAL(20,8),
    "size" DECIMAL(20,8),
    "rPlanned" DOUBLE PRECISION,
    "rRealized" DOUBLE PRECISION,
    "pnl" DECIMAL(20,8),
    "outcome" "Outcome" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,
    "tags" TEXT[],
    "screenshotUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Trade_userId_openedAt_idx" ON "Trade"("userId", "openedAt");
CREATE INDEX "Trade_symbol_idx" ON "Trade"("symbol");
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Autopsy" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ocrJson" JSONB,
    "structureJson" JSONB,
    "smJson" JSONB,
    "psychJson" JSONB,
    "score" INTEGER NOT NULL,
    "verdict" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "improvement" TEXT NOT NULL,
    "rebuyZone" TEXT,
    "flags" TEXT[],
    "concepts" TEXT[],
    "modelVersion" TEXT NOT NULL DEFAULT 'voidexx-vision-1',
    "costMicros" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Autopsy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Autopsy_tradeId_key" ON "Autopsy"("tradeId");
CREATE INDEX "Autopsy_userId_createdAt_idx" ON "Autopsy"("userId", "createdAt");
ALTER TABLE "Autopsy" ADD CONSTRAINT "Autopsy_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Autopsy" ADD CONSTRAINT "Autopsy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tradeId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tags" TEXT[],
    "mood" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "JournalEntry_tradeId_key" ON "JournalEntry"("tradeId");
CREATE INDEX "JournalEntry_userId_createdAt_idx" ON "JournalEntry"("userId", "createdAt");
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PsychologyReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "archetype" TEXT NOT NULL,
    "composite" INTEGER NOT NULL,
    "discipline" INTEGER NOT NULL,
    "patience" INTEGER NOT NULL,
    "conviction" INTEGER NOT NULL,
    "riskAwareness" INTEGER NOT NULL,
    "tiltResistance" INTEGER NOT NULL,
    "flagsJson" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PsychologyReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PsychologyReport_userId_periodEnd_idx" ON "PsychologyReport"("userId", "periodEnd");
ALTER TABLE "PsychologyReport" ADD CONSTRAINT "PsychologyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ExchangeConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "venue" "Venue" NOT NULL,
    "apiKeyEnc" TEXT NOT NULL,
    "apiSecretEnc" TEXT NOT NULL,
    "passphraseEnc" TEXT,
    "scopes" TEXT[],
    "paperMode" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCheck" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExchangeConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExchangeConnection_userId_venue_key" ON "ExchangeConnection"("userId", "venue");
CREATE INDEX "ExchangeConnection_userId_idx" ON "ExchangeConnection"("userId");
ALTER TABLE "ExchangeConnection" ADD CONSTRAINT "ExchangeConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AutomationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exchangeId" TEXT,
    "kind" "AutomationKind" NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AutomationLog_userId_createdAt_idx" ON "AutomationLog"("userId", "createdAt");
ALTER TABLE "AutomationLog" ADD CONSTRAINT "AutomationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationLog" ADD CONSTRAINT "AutomationLog_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "ExchangeConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerRef" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payment_providerRef_key" ON "Payment"("providerRef");
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "rewarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Referral_code_key" ON "Referral"("code");
CREATE UNIQUE INDEX "Referral_fromId_toId_key" ON "Referral"("fromId", "toId");
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AdPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "showAds" BOOLEAN NOT NULL DEFAULT true,
    "topics" TEXT[],
    CONSTRAINT "AdPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdPreference_userId_key" ON "AdPreference"("userId");
ALTER TABLE "AdPreference" ADD CONSTRAINT "AdPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
