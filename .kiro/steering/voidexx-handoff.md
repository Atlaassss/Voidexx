---
title: VOIDEXX · session handoff
description: Project state, conventions, and the active phase. Read FIRST when continuing work on this repo.
inclusion: always
---

# Voidexx handoff

This is the persistent context for the Voidexx project. Read this file at the
start of any session that touches the repo, and update it whenever a phase
ships or the active priorities shift.

## Aesthetic & tech invariants

- Codename **"Jailbroken Terminal"**. Pure `#000` background, deep radial
  gradients (violet 8%, cyan 5%), HUD aesthetic — never glassmorphism,
  never purple-on-white.
- Display type **Anton**, body **Geist**, data **JetBrains Mono**, editorial
  italic **Instrument Serif**. Avoid Inter / Roboto / Space-Grotesk.
- Signal palette: red `#ff2e3b`, green `#00ff9d`, amber `#ffb000`, violet
  `#7b2bff`, cyan `#00e5ff`.
- Stack: Next 15 (app router), React 19, TS 5.7, Tailwind 3.4, Framer
  Motion 11, Prisma 6, Clerk 6, OpenAI 4.77, Stripe 17, Resend 4.
- The app **boots in demo mode without any env vars** — every subsystem has
  a graceful no-op fallback. `DemoBanner` declares which subsystems are
  unwired. Any feature added to the codebase must preserve that property.

## Active phase — Phase 9 (in flight, this PR)

Phase 9 reshapes the product around three observations from Phase 8 user
feedback:

1. The autopsy report tells the user *why* the trade lost, but not *what to
   do next*. → Surface win probability, risk band, and an ordered next-action
   list directly on the report.
2. Automation (auto-trading) added compliance surface (KYC, regulatory
   classification) without driving meaningful retention. → Removed entirely.
3. Traders kept a separate browser tab open for X/CNBC/Bloomberg during
   sessions. → Built an in-app news feed.

### What shipped in Phase 9

- **Autopsy report enrichment** — `AutopsyResponse` now carries
  `winProbability` (0..1), `riskLevel` (`LOW | MEDIUM | HIGH | EXTREME`),
  and `nextActions` (ordered, imperative-voice steps with rationale + tone).
  The score itself is unchanged; the new fields are derived deterministically
  in `lib/ai/scoring.ts`. The vision/verdict prompt was extended to ask the
  model for `next_actions` directly; if the model omits them, scoring.ts
  synthesises a list from the top red flag + rebuy zone + concept tags.
  `lib/ai/mock.ts` archetypes ship curated next-action lists for demo mode.
- **Automation removed** — deleted `src/app/dashboard/automation/`,
  `src/app/api/exchange/`, `src/lib/exchange/`, `src/lib/crypto.ts`. Removed
  Automation from sidebar/mobile-nav, footer, FAQ, plan feature bullets.
  The Prisma schema still has `ExchangeConnection` / `AutomationLog` /
  `Venue` to avoid a destructive migration; nothing reads those tables now.
- **Global news feed** — `lib/news.ts` (curated headline pool keyed by
  source: Reuters, Bloomberg, CNBC, BBC, AlJazeera, AP, X (Twitter),
  CoinDesk, The Block, Decrypt; categories MACRO/FED/CRYPTO/FX/EQUITY/
  COMMODITY/GEOPOLITICS/ON_CHAIN), `/api/news` route, `/dashboard/news`
  page (filter chips ALL/WIRE/TV/SOCIAL/CRYPTO + relative-time + bias dot
  + impact 1..5), `NewsRail` panel on Command Center.
- **Launch-discount pricing** — `PLANS` now carries `originalPriceUsd`
  + `originalPricePhp` and the public surfaces render strikethrough was-prices
  with a red `−NN%` chip. Live prices: Recon $0, Operator $15.88 (was $29),
  Desk $24.88 (was $49). PHP is computed at USD×56 (override per-tier with
  `PAYMONGO_PRICE_*_PHP` in centavos when FX drifts).
- **PayMongo activation surface** — new `PaymongoSetupGuide` client
  component on `/dashboard/billing` walks the merchant through the 7-step
  activation flow (sign-up → activate → bank → keys → webhook → migrate →
  smoke test) and renders the canonical webhook URL with copy-to-clipboard.

## PayMongo wiring (the order, in production)

PayMongo enforces some of these at the API level — won't issue live keys
before activation, won't release funds before bank verification — so this
order isn't optional.

1. **Sign up** at <https://dashboard.paymongo.com> using the business email
   you'll keep forever (it's on customer receipts).
2. **Activate** — upload IDs, business permits, DTI/SEC docs. Activation
   typically clears in 1-3 business days. Until activated, only test keys
   (`sk_test_*` / `pk_test_*`) work.
3. **Connect a settlement bank account** — Settings → Settlement → add a
   peso account. PayMongo settles weekly; first payout has a 7-day hold.
4. **Pull live API keys** — Developers → API Keys. Set in deploy env:
   - `PAYMONGO_SECRET_KEY` = `sk_live_*`
   - `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY` = `pk_live_*`
5. **Create a webhook** — Developers → Webhooks → New endpoint:
   - URL: `https://YOUR-DOMAIN/api/billing/paymongo/webhook`
   - Events: `payment.paid`, `payment.failed`, `payment_intent.succeeded`,
     `payment_intent.payment_failed`
   - Set `PAYMONGO_WEBHOOK_SECRET` = signing secret from the dashboard.
6. **Hook up your custom domain** — Vercel → Settings → Domains. Set
   `NEXT_PUBLIC_APP_URL` to match. PayMongo webhooks only arrive at the
   domain configured on the merchant side, NOT at preview URLs.
7. **Migrate the production database** — `npm run db:migrate` (=
   `prisma migrate deploy`). The relevant migrations are in
   `prisma/migrations/20260524000002_paymongo/` and earlier — idempotent.
8. **Flip to live**, redeploy, smoke test:
   - Open `/dashboard/billing`, click *Pay via GCash · Operator*
   - Authorise in the GCash app → return to
     `/dashboard/billing?checkout=success&provider=paymongo`
   - Within ~30s the webhook lands; the User row flips to `OPERATOR`,
     `subscriptionStatus=active`. Inspect `WebhookEvent` for the
     corresponding `done` row to prove idempotency claim worked.
9. **Set the cron secret** — Vercel injects `CRON_SECRET` automatically
   for Vercel Cron. Confirm `/api/cron/payment-expiry` returns
   `{ ok: true, scanned: 0, ... }` with the bearer header.

If anything 503s with `paymongo_not_configured`, double-check the **secret**
key is `sk_*` not `pk_*` — easy mistake, identical naming, opposite roles.

## Pricing source-of-truth

`src/lib/billing/plans.ts` is the SSOT. Marketing (`Pricing.tsx`) mirrors
the same values manually because the marketing bundle can't import the
env-coupled `PLANS` dict. **Update both** when prices change, or add a
build-time check.

| Plan      | Live USD   | Was USD  | Live PHP  | Was PHP   |
| --------- | ---------- | -------- | --------- | --------- |
| Recon     | $0         | —        | ₱0        | —         |
| Operator  | $15.88     | $29      | ₱889      | ₱1,624    |
| Desk      | $24.88     | $49      | ₱1,393    | ₱2,744    |

`PaymongoCentavos` is `priceUsd × 56 × 100` rounded to integer (PayMongo
rejects fractional centavos). Override per-plan with `PAYMONGO_PRICE_*_PHP`
when FX rate drifts more than a few percent.

## Conventions to follow

- **Demo-mode preservation** — every new subsystem must boot without env
  vars and surface unwired-ness in `DemoBanner`. Adding a hard env
  requirement breaks local development for new contributors.
- **No new migrations unless required** — Phase 9 added zero migrations.
  When a feature can be derived from existing columns + computation, do
  that instead. The autopsy GET re-derives `winProbability` /
  `riskLevel` / `nextActions` at read time rather than persisting them.
- **No tests unless explicitly requested** — repo doesn't ship a test
  suite yet. Adding tests is a Phase 10 concern.
- **Aesthetic gate** — every new UI surface gets read against the four
  rules: brutalist Anton headline rhythm, JetBrains-Mono HUD captions,
  signal-palette accents, no-glassmorphism. If a panel feels like a
  generic SaaS dashboard, redo it.

## Out of scope (intentionally deferred)

- Discord OAuth + push notifications (was Phase 7.5, still deferred).
- Real news API integration (X v2 filtered streams, Polygon News, etc.).
  Current implementation rotates a curated headline pool deterministically
  by UTC hour. The plumbing is ready — `lib/news.getNewsFeed()` just
  needs to swap to a network fetch.
- PayPal billing rail. Stripe + PayMongo cover the same surface.
- Test suite (Phase 10).
