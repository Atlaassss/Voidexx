# VOIDEXX

> AI Trade Autopsy. Bloomberg-Terminal-meets-cyberpunk trading intelligence.

Upload a screenshot of a losing trade. The engine reads the chart, decodes the
smart-money mechanics that took your stop, scores your psychology, and writes
the autopsy a prop-firm desk would. Then it remembers.

This repo is the **foundation cut**. It ships the visual system, the marketing
surface, the dashboard, the autopsy interaction, and clean architectural seams
for AI, payments, exchange wiring and admin to plug into.

---

## Status

| Area | Built | Notes |
| ---- | ----- | ----- |
| Marketing site | ✅ | Hero + animated terminal, ticker, live demo, features, social proof, pricing, FAQ, footer |
| Sticky ad rail (free tier) | ✅ | Hides for paid users, dismissible, lg+ only |
| Dashboard shell | ✅ | Sidebar (lg+) + mobile bottom nav + reusable Topbar |
| Command Center | ✅ | KPIs w/ sparklines, equity curve, AI directives, global news rail, recent autopsies |
| Trade Autopsy upload | ✅ | Drag-drop, presigned upload w/ progress, 4-phase pipeline, full report from `/api/autopsy` |
| Autopsy: win-prob + risk + next actions (Phase 9) | ✅ | Win probability (0..1), risk band (LOW/MEDIUM/HIGH/EXTREME), ordered next-action list — derived deterministically in `lib/ai/scoring.ts` |
| Global news feed (Phase 9) | ✅ | `/api/news` + `/dashboard/news`; X (Twitter), TV (CNBC/BBC/Bloomberg/Al Jazeera), wires (Reuters/Bloomberg/AP), crypto (CoinDesk/The Block) — filterable by medium |
| Launch-discount pricing (Phase 9) | ✅ | Recon $0 · Operator $15.88 (was $29) · Desk $24.88 (was $49). Strikethrough originals + "−NN%" chip; PHP via PayMongo |
| Journal / Analytics / Psychology / News / Leaderboards / Learn / Settings / Billing | ✅ | Each route has rich content, not blank stubs |
| Automation removed (Phase 9) | ✅ | `/dashboard/automation`, `/api/exchange/*`, `lib/exchange/*`, `lib/crypto.ts` deleted; auto-trading is intentionally not a product feature |
| Prisma schema | ✅ | Users, trades, autopsies, journals, psych, exchanges, payments, automation logs, ads, referrals (Exchange/Automation tables retained but unused) |
| Initial migration SQL | ✅ | `prisma/migrations/20260522120000_init/migration.sql`, ready for `prisma migrate deploy` |
| Auth (Clerk) | ✅ | Middleware-protected dashboard + API, themed `/sign-in` & `/sign-up`, `<UserButton />` in topbar |
| Demo mode | ✅ | App boots without ANY env vars; banner declares which subsystems are unwired |
| Storage (S3 / R2) | ✅ | Presigned PUT issued by `/api/uploads`; works with AWS S3 or Cloudflare R2 endpoint |
| AI engine v1 | ✅ | gpt-4o vision + verdict passes, deterministic scorer, NDJSON streaming, 4 archetype mocks |
| API surface | ✅ | `/api/uploads`, `/api/autopsy` real (auth + zod + quota + DB persistence + streaming); `/api/autopsy/[id]` reads persisted reports |
| Real AI vision pipeline | ✅ | Streams progress over NDJSON; cost-tracked in `Autopsy.costMicros` |
| Stripe billing | ✅ | Real Checkout, webhook → plan upgrade, customer portal, cost-tracked Payment rows; demo-mode shows `Stripe · demo` chip |
| PayMongo billing (PH rail) | ✅ | GCash · Maya · GrabPay redirect flow via PaymentIntent + signed webhook; PHP pricing toggle on marketing; expiry cron sweeps abandoned intents; in-app activation guide on `/dashboard/billing` |
| GCash / Maya / PayPal | ✅ | GCash + Maya + GrabPay shipped via PayMongo (Phase 7.1); PayPal still deferred |
| Admin panel | ✅ | Role-gated route group, user management, audit log, AI cost dashboard |
| Webhook idempotency | ✅ | `WebhookEvent` table, claim-before-process pattern on Stripe webhook |
| Vercel Cron (quota reset) | ✅ | Monthly RECON quota bulk reset via `/api/cron/quota-reset` |
| Structured logging | ✅ | JSON-line prod logger, service-scoped, level-gated |
| Autopsy retry UX | ✅ | Retry button on pipeline failure, re-runs without re-upload |
| Referrals + affiliates | ✅ | Per-user share code, `/r/<code>` first-touch attribution cookie, dashboard with copy/share/tier-progress UI, paid-conversion auto-reward via billing webhook |
| SEO | ✅ | Sitemap, robots, generated OG image, full metadata graph, per-page canonicals |
| Blog (MDX) | ✅ | File-based at `content/blog/*.mdx`, SSG pre-rendered, custom prose styling, two seed posts |
| Email (transactional) | ✅ | Resend wrapper with welcome / autopsy-ready / plan-changed templates; demo-mode logs instead of sending |
| Discord OAuth + push | ⏳ | Deferred to Phase 7.5 — orthogonal to growth foundation |

`✅` shipped · `🟡` partial · `⏳` planned

---

## Aesthetic direction

Codename **"Jailbroken Terminal"**. Not generic "neon glow on black".

| Token | Value |
| ----- | ----- |
| Display type | **Anton** — condensed industrial, brutalist headline rhythm |
| Body type | **Geist** — modern, neutral, distinctive |
| Data / mono | **JetBrains Mono** — tactical HUD readouts |
| Editorial italic | **Instrument Serif** — used sparingly for emphasis |
| Background | Pure `#000` with deep radial gradients (violet 8%, cyan 5%) |
| Signal palette | Red `#ff2e3b` · Green `#00ff9d` · Amber `#ffb000` · Violet `#7b2bff` · Cyan `#00e5ff` |
| Motifs | Crosshair brackets, scan lines, fine grid, ticker tape, monospace HUD |

Avoid: purple-on-white gradients, glassmorphism-by-default, Inter/Roboto/Space-Grotesk, generic AI dashboard layouts.

---

## Tech

```
Next.js 15.1 (app router, RSC)
React 19
TypeScript 5.7
Tailwind 3.4
Framer Motion 11
lucide-react
```

Planned:
- **DB**: PostgreSQL via Prisma (schema in `prisma/schema.prisma`)
- **Cache / queue**: Redis (BullMQ for AI workers)
- **Auth**: Clerk (preferred) or Auth.js
- **Storage**: S3 / R2 with presigned URLs
- **AI**: OpenAI vision + bespoke Python microservice for ICT/SMC structural pass
- **Payments**: Stripe primary; PayPal, GCash (Xendit), Maya (Xendit)
- **Deploy**: Vercel (web), Railway (workers), Supabase (DB), Cloudflare (DNS / DDoS)

---

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

The app **runs out of the box with no env vars** — a yellow demo banner appears
at the top of every page declaring which subsystems are unwired (`auth`, `db`,
`uploads`). Every page works against in-memory or stubbed data, so you can demo
the full UX without a backend.

To graduate each subsystem, copy `.env.example` to `.env.local` and fill in the
relevant block:

| Subsystem | Required env | What activates |
| ---- | ---- | ---- |
| Clerk auth | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | `/sign-in` & `/sign-up` mount real Clerk UI; middleware enforces session on `/dashboard` and protected APIs; `<UserButton />` replaces demo chip |
| Database | `DATABASE_URL` (Postgres / Supabase) | `/api/autopsy` persists `Trade` + `Autopsy` rows; quota counter ticks on `User.freeUsageMonth`; `/api/autopsy/[id]` reads them back |
| Storage | `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (+ optional `S3_ENDPOINT` for R2) | Upload page hits real presigned PUT URLs; uploads stream directly browser → S3 with progress; orchestrator fetches the bytes for the vision pass |
| AI | `OPENAI_API_KEY` | Vision + verdict passes hit `gpt-4o`; `Autopsy.costMicros` tracks per-trade USD cost; without it, the orchestrator returns one of 4 self-coherent demo archetypes keyed off `uploadId` hash |
| Billing | `STRIPE_SECRET_KEY` + `STRIPE_PRICE_OPERATOR` + `STRIPE_PRICE_DESK` (+ `STRIPE_WEBHOOK_SECRET` for prod) | `/api/billing/checkout` issues real Stripe Checkout sessions; `/api/billing/webhook` upgrades/downgrades on `checkout.session.completed` etc.; `/api/billing/portal` mounts the Stripe customer portal for self-service plan changes |
| Billing (PH) | `PAYMONGO_SECRET_KEY` (+ `PAYMONGO_WEBHOOK_SECRET` for prod, optional `PAYMONGO_PRICE_OPERATOR_PHP` / `PAYMONGO_PRICE_DESK_PHP` overrides) | `/api/billing/checkout` accepts `provider:"paymongo", method:"gcash"\|"paymaya"\|"grab_pay"`; redirects to the chosen e-wallet; `/api/billing/paymongo/webhook` settles the upgrade on `payment.paid` / `payment_intent.succeeded`; hourly `/api/cron/payment-expiry` sweeps abandoned intents |

Type-check:

```bash
npm run typecheck
```

Apply DB migrations (once `DATABASE_URL` is set):

```bash
npm run db:generate     # generate Prisma Client
npm run db:migrate      # prisma migrate deploy (production)
# or
npm run db:dev          # prisma migrate dev (local schema iteration)
```

Production build:

```bash
npm run build
npm start
```

---

## Project structure

```
src/
  middleware.ts             # Clerk-or-noop route protection
  app/
    layout.tsx              # fonts + globals + conditional ClerkProvider
    globals.css             # design tokens + HUD utilities
    page.tsx                # marketing landing
    sign-in/[[...sign-in]]/ # Clerk SignIn (or demo notice in demo mode)
    sign-up/[[...sign-up]]/ # Clerk SignUp (or demo notice in demo mode)
    dashboard/
      layout.tsx            # sidebar + mobile nav + grid bg
      page.tsx              # Command Center
      upload/
        page.tsx            # server shell
        UploadClient.tsx    # interactive ingest pipeline
      journal/page.tsx
      analytics/page.tsx
      psychology/page.tsx
      automation/page.tsx
      leaderboards/page.tsx
      learn/page.tsx
      settings/page.tsx     # reads real session
      billing/page.tsx
    api/
      health/route.ts
      uploads/route.ts      # presigned PUT, auth + zod
      autopsy/route.ts      # auth + zod + quota + DB persistence
      autopsy/[id]/route.ts
      trades/route.ts
      billing/checkout/route.ts
      billing/webhook/route.ts
      exchange/connect/route.ts
  components/
    DemoBanner.tsx          # banner declaring unwired subsystems
    marketing/              # TopNav, Ticker, Hero, TerminalCard, LiveDemo, ...
    dash/                   # Sidebar(+Nav), Topbar(+Clock,Search), UserChip,
                            # Panel, Sparkline, MobileNav
  lib/
    env.ts                  # typed env + feature flags (clerk/db/s3 enabled?)
    auth.ts                 # getSessionUser / requireUser (Clerk or demo)
    db.ts                   # Prisma singleton (lazy)
    storage.ts              # S3/R2 presigned URL issuer
    quota.ts                # free-tier autopsy counter
    validation.ts           # zod schemas for API inputs
    utils.ts                # cn() + formatters
    api/
      contracts.ts          # shared request/response types
prisma/
  schema.prisma             # full domain model
  migrations/
    migration_lock.toml
    20260522120000_init/migration.sql
```

---

## AI pipeline (Phase 3 — shipped)

```
[ Client ] -- presigned PUT --> [ S3 / R2 ]
[ Client ] -- POST /api/autopsy { uploadId } --> [ web ]
                                                    |
                                       runAutopsy() orchestrator
                                                    |
   ┌────────────────┬────────────────┬─────────────┬──────────────┐
   v                v                v             v              v
 fetch          vision           verdict        score         persist
 (S3 GET)    (gpt-4o + img)   (gpt-4o text)  (rule-based)   (Prisma)
   |                |                |             |              |
   └────────────────┴───►  emit() ───┴─────────────┴──────────────┘
                                  │
                                  v
                   NDJSON stream → client (1 line per phase)
```

- **Streaming**: `/api/autopsy` returns `application/x-ndjson` — one
  ProgressEvent per line. The client consumes it with a `ReadableStream`
  reader. SSE wasn't usable here because EventSource doesn't support
  POST bodies in browsers.
- **Cancellation**: client `AbortController` propagates through `req.signal`
  to the OpenAI SDK. Closing the tab during a vision pass cancels the
  upstream call so we don't burn tokens on abandoned uploads.
- **Cost guard**: every Autopsy row stamps `costMicros` (1/1,000,000 USD)
  computed from `usage.prompt_tokens` + `usage.completion_tokens` × the
  current gpt-4o pricing. Free tier hard-caps at 5 autopsies/month via
  `User.freeUsageMonth` (reset by daily cron — wire in Phase 6 admin).
- **Scoring is deterministic**: the model never produces the 0–100 score.
  `lib/ai/scoring.ts` applies transparent rules over the parsed structure
  + flags (confluence bonuses, R:R bonuses, liquidity-proximity penalties,
  per-flag weighted deltas, low-confidence damping). This keeps the
  metric stable and auditable across prompt drift.
- **Mock fallback with archetype variance**: without `OPENAI_API_KEY`,
  the orchestrator picks one of 4 hand-crafted archetypes
  (clean OB long, liquidity-trap short, FOMO chase, patient sniper)
  by `hash(uploadId) % 4`. Each archetype is internally coherent —
  the structure, verdict, flags, and concept tags all match the same
  story. Demos see the full score range (0..92) instead of a single
  canned response.

### Vision pass prompt principles

- Strict JSON output, never prose, no markdown fences.
- Extract: candles count, range hi/lo, BOS/CHOCH lines, OBs, FVGs, sweeps, equal-highs/lows, trade marks (entry/stop/target).
- One call per autopsy → structure pass; one call → narrative pass over the structure JSON.
- `temperature: 0.2` for vision (factual reading), `0.4` for verdict (narrative).
- `max_tokens` capped at 800 / 700 to bound worst-case cost (~$0.005 per autopsy).

---

## Security non-negotiables

- TLS everywhere, HSTS, CSP, Frame-Ancestors `'none'`
- Exchange API secrets encrypted with KMS-derived AEAD; never sent to client
- Reject exchange keys with withdraw scope server-side
- Rate-limit `/api/autopsy` per user (Redis token bucket)
- Sign all webhooks (Stripe, PayPal, exchanges) and verify signatures
- 2FA available for everyone, required for admins
- Admin actions write to an audit log (add `AdminAuditLog` model when admin lands)

---

## Roadmap

**Phase 1 — Foundation** ✅ shipped (PR #1)
- Visual system, marketing, dashboard shell, autopsy interaction, schemas, contracts.

**Phase 2 — Real auth + storage** ✅ shipped (this PR)
- Clerk integration with conditional mounting, middleware-protected `/dashboard` + APIs.
- Themed `/sign-in` and `/sign-up` shells matching the terminal aesthetic.
- Demo-mode fallback so the app runs locally without ANY env vars.
- S3/R2 presigned uploads via `/api/uploads`, real upload-with-progress flow.
- Auth-gated, zod-validated, quota-enforced `/api/autopsy` with optional Prisma persistence.
- Initial migration SQL ready for `prisma migrate deploy` on Supabase.

**Phase 3 — AI engine v1** ✅ shipped (this PR)
- Two-pass pipeline: gpt-4o vision (structure JSON) → gpt-4o text (verdict narrative).
- Deterministic 0–100 scorer in `lib/ai/scoring.ts` — transparent rules, not asked of the model.
- NDJSON streaming endpoint with phase events (fetch → vision → verdict → score → persist), client-side reader, abort-aware.
- S3 GetObject → base64 data URL handoff to the vision API (works for private buckets).
- Token-counted cost stamping on every `Autopsy.costMicros`.
- Mock fallback with 4 self-coherent archetypes (BTC trap, EUR clean, SOL FOMO, XAU sniper) keyed off uploadId hash for diverse demos.
- Real `GET /api/autopsy/[id]` returning persisted reports.

**Phase 4 — Billing live** ✅ shipped (this PR)
- Stripe Checkout via `/api/billing/checkout` (zod + auth + ensureDbUser + idempotency keys).
- Stripe webhook at `/api/billing/webhook` with signature verification, handles checkout.session.completed, customer.subscription.created/updated/deleted, invoice.payment_succeeded/failed.
- Customer Portal via `/api/billing/portal` for self-service plan changes, payment method updates, cancellation.
- `lib/billing/plans.ts` is the SSOT for plan id ↔ Stripe price id ↔ feature bullets.
- Billing page reads real `User.plan` / `freeUsageMonth` / `planRenewsAt` / `subscriptionStatus` from Postgres, falls back to demo data when unconfigured. Buttons disable while a checkout request is in flight, show "Current plan" when already on that tier.
- New User columns: `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus`. Migration in `prisma/migrations/20260523000001_billing/`.
- Pre-Phase-4 hardening: Clerk → User row lazy upsert (`ensureDbUser`); race-free quota increment via atomic `updateMany`; production warning when env blocks are missing.
- PayPal / GCash / Maya intentionally deferred — Stripe covers the global market well enough for v1 and PH-specific rails (Xendit) are a Phase 5/6 follow-up.

**Phase 5 — Exchange wiring** ✅ shipped (this PR)
- BingX REST adapter (`lib/exchange/bingx.ts`) — HMAC-SHA256 signed `getBalance`, with proper error mapping (auth/rate-limit/upstream-down).
- AES-256-GCM credential vault in `lib/crypto.ts` — 12-byte random IV + 16-byte tag per record, `v1:` versioned envelope, base64-or-hex 32-byte key. Demo-mode plaintext fallback (`plain:`) refused in production.
- `POST /api/exchange/connect` probes credentials BEFORE persisting (no garbage rows on bad keys), then encrypts secrets and upserts an `ExchangeConnection`.
- `GET /api/exchange/[id]` refreshes balance + caches it; `DELETE /api/exchange/[id]` revokes and wipes the encrypted blob.
- Risk engine (`lib/exchange/risk.ts`) — pure `isLockedOut(state, caps)` over daily-loss cap / max-concurrent / tilt cool-down. Wires into Phase 6 order placement.
- Automation page is now real: server fetches the user's connections, client modal handles BingX link with paper-mode locked on (live trading is Phase 6).
- Pre-Phase-5 hardening included in this PR: quota refund on autopsy failure, lazy monthly quota reset, mock-mode prod refusal, score floor 0→2, Stripe customer idempotency-key.

**Phase 6 — Admin + analytics** ✅ shipped (this PR)
- `(admin)` route group, user management, audit log, AI cost dashboard.
- `WebhookEvent` idempotency table — Stripe webhook claims before processing.
- Live order placement with 2FA consent gate (`/api/exchange/consent` → `/api/exchange/order`); paper mode skips, live requires TOTP-verified consent token.
- Vercel Cron at `/api/cron/quota-reset` — monthly bulk reset for RECON quota counters.
- Structured logger (`lib/logger.ts`) — JSON lines in prod, pretty-print in dev.
- Autopsy retry button — re-runs pipeline against the same screenshot without re-upload.

**Phase 7 — Growth (foundation)** ✅ shipped (this PR)
- **Referrals + affiliates** — per-user 8-char share code, `/r/<code>` redirector with 30-day first-touch attribution cookie, full dashboard at `/dashboard/referrals` (copy code, copy URL, native Share API, tier progress bar, recent invitees with privacy-masked names). Paid-conversion auto-rewards via the billing webhook (`markRefereeConverted`).
- **SEO** — `metadataBase`, title template, full OpenGraph + Twitter graph, dynamic OG image at `/opengraph-image` (generated with `next/og` in the brand aesthetic), `sitemap.xml` and `robots.txt` via Next 15 file conventions.
- **Blog** — file-based MDX at `content/blog/*.mdx` with typed frontmatter, custom prose-styling MDX components, SSG pre-rendering. Two seed posts shipped: *Anatomy of a Liquidity Grab* and *Four Archetypes Every Losing Trade Falls Into*.
- **Transactional email** — Resend integration (`lib/email/`) with hand-rolled HTML templates for the three flows: welcome (sent from `ensureDbUser` on first mirror, with referral cookie claim), autopsy-ready (sent from orchestrator after persist), plan-changed (sent from billing webhook). Demo-mode logs the email instead of sending so the rest of the app stays wired.
- **Demo contract preserved** — every new subsystem boots without env vars and surfaces unwired-ness in the DemoBanner.

**Phase 7.1 — PayMongo (PH billing rail)** ✅ shipped (this PR)
- **Provider abstraction in checkout** — `POST /api/billing/checkout` now accepts `{ plan, provider: "stripe"|"paymongo", method?: "gcash"|"paymaya"|"grab_pay"|"dob"|"dob_ubp"|"billease" }`. Stripe path unchanged; PayMongo path runs the PaymentIntent → PaymentMethod → attach dance and returns a redirect URL the client navigates to.
- **PayMongo client** (`lib/billing/paymongo.ts`) — typed `paymongoFetch<T>()` with explicit Basic-auth header construction (no caller-init spread, so Next.js fetch instrumentation can't leak headers PayMongo rejects), the four domain helpers (`createPaymentIntent` / `createEwalletPaymentMethod` / `attachPaymentMethod` / `getPaymentIntent`), and `verifyWebhookSignature()` doing constant-time HMAC-SHA256 over `t.<rawBody>` with a ±5 min tolerance window.
- **Webhook** at `/api/billing/paymongo/webhook` — signature-verified, idempotency-claimed via the existing `WebhookEvent` table, handles `payment.paid` / `payment_intent.succeeded` / `payment.failed`. On success: flips the User's plan, persists a Payment row with `provider: "PAYMONGO"`, fires `markRefereeConverted` for the referral attribution chain, and sends the plan-changed email.
- **Expiry cron** at `/api/cron/payment-expiry` — runs hourly (configured in `vercel.json`), probes every User with a stale `paymongoIntentId` against PayMongo's API, and clears the field for terminal-not-success states (`cancelled` / `awaiting_*` past expiry / 404 from PayMongo). The "user closed the tab and never came back" case fires no webhook — this cron is the only thing that catches it.
- **Schema** — `Payment.provider` enum extended with `PAYMONGO`; `User.paymongoIntentId` (unique, nullable) + `User.paymongoIntentExpires`; migration in `prisma/migrations/20260524000002_paymongo/`.
- **International methods** — every PayMongo PaymentIntent allows `["card"]` alongside the chosen e-wallet, so PayMongo's hosted page transparently offers Visa/MC/JCB/Amex (with 3-D Secure required) when the user's primary method isn't installed on their device.
- **Marketing pricing** — `Pricing.tsx` now has a USD↔PHP currency toggle. PHP shows the GCash/Maya prices that get charged on PayMongo. Footer copy updates to match the active rail.
- **Settings + DemoBanner** — billing-status row composes "Stripe + PayMongo · live" / "Stripe · live" / "PayMongo · live (PH)" / "Demo" depending on which keys are wired. Banner only flags `[billing]` when **both** rails are unwired so a PH-first deploy isn't held up by missing Stripe config.

**Phase 7.5 — Growth (Discord + push)** — deferred
- Discord OAuth + webhook bridge, web push notifications. Orthogonal to the growth foundation; cleaner as a focused follow-up PR.

**Phase 9 — Reshape: better autopsy, news, drop automation, launch pricing** ✅ shipped (this PR)
- **Autopsy → win prob + risk + next actions** — `AutopsyResponse` carries `winProbability` (0..1, "if you follow the corrected plan"), `riskLevel` (LOW / MEDIUM / HIGH / EXTREME), and `nextActions` (3-5 ordered, imperative-voice steps with rationale + tone). All three derived deterministically in `lib/ai/scoring.ts` from the structure + verdict + score. The verdict prompt now asks the model for `next_actions` directly; if the model omits them, scoring synthesises a fallback list from the worst red flag + rebuy zone + concept tags. UploadClient renders a `ProbabilityRiskStrip` (split panel: prob bar + risk band) and a numbered `NextActionsPanel` directly under the score. Mock archetypes ship curated next-action lists for demo mode; `GET /api/autopsy/[id]` re-derives at read time.
- **Automation removed** — `/dashboard/automation`, `/api/exchange/{order,consent,connect,[id]}`, `lib/exchange/*`, `lib/crypto.ts` deleted. Sidebar / mobile-nav / footer / FAQ / plan feature bullets all updated. Auto-trading is intentionally not a Voidexx feature; the engine reads charts and writes the post-mortem, the trader stays in the chair. Prisma `ExchangeConnection` / `AutomationLog` / `Venue` retained to avoid a destructive migration.
- **Global market news feed** — `lib/news.ts` with a curated headline pool spanning Reuters, Bloomberg, Bloomberg TV, CNBC, BBC, Al Jazeera, AP, X (Twitter — verified handles like @elonmusk / @WatcherGuru / @DeItaone / @unusual_whales), CoinDesk, The Block, Decrypt across MACRO/FED/CRYPTO/FX/EQUITY/COMMODITY/GEOPOLITICS/ON_CHAIN. Deterministic per-UTC-hour rotation so SSR + client renders stay aligned. `/api/news` (GET, filterable by `medium=WIRE|TV|SOCIAL|CRYPTO`, `category`, `source`, `limit`), `/dashboard/news` (filter chips, refresh, relative-time, bias dot, impact 1-5 indicator, verified ✓), `NewsRail` panel on Command Center showing top-6 by impact.
- **Launch-discount pricing** — `PLANS.{originalPriceUsd, originalPricePhp}` drives strikethrough was-prices with a red `−NN%` chip across `/` (`Pricing.tsx`) and `/dashboard/billing` (`PlanCard`). Prices: Recon $0 (forever) · Operator $15.88 (was $29, save 45%) · Desk $24.88 (was $49, save 49%). PHP via PayMongo: ₱889 / ₱1,393 (USD × 56, override per-tier with `PAYMONGO_PRICE_*_PHP` in centavos).
- **PayMongo activation surface** — `PaymongoSetupGuide` client component on `/dashboard/billing` walks the merchant through the 7-step flow (sign-up → activate → bank → keys → webhook → migrate → smoke test) with copy-to-clipboard webhook URL and external-link buttons to the PayMongo dashboard + API reference. Renders only when the env isn't fully wired; collapses once both `PAYMONGO_SECRET_KEY` + `PAYMONGO_WEBHOOK_SECRET` are present.
- **Steering file** — `.kiro/steering/voidexx-handoff.md` carries the persistent project context, aesthetic invariants, current-phase notes, and the canonical PayMongo wiring order so future sessions don't have to re-derive any of it.


---

## Launch checklist (PayMongo · PH-first)

The order below is the actual order — earlier steps unblock later ones, and PayMongo enforces a few of these at the API level (won't issue live keys before the bank account is verified, won't release funds before activation completes).

1. **Sign up at the [PayMongo dashboard](https://dashboard.paymongo.com)** — use the business email you'll keep forever; this is what shows on customer receipts.
2. **Activate the account** — fill in business details (sole prop / corp), upload IDs, business permits, and DTI/SEC docs. Activation usually clears in 1–3 business days. Until activated, only **test** keys (`sk_test_*` / `pk_test_*`) work.
3. **Connect a bank account** — Settings → Settlement → add a peso account. PayMongo settles weekly (first payout has a 7-day hold for new merchants). Bank verification is a small-deposit-match flow.
4. **Pull the live API keys** — Developers → API Keys. Copy `sk_live_*` (server) and `pk_live_*` (browser) into `PAYMONGO_SECRET_KEY` + `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY`.
5. **Create a webhook endpoint** — Developers → Webhooks → New endpoint. URL: `https://YOUR-DOMAIN/api/billing/paymongo/webhook`. Subscribe to `payment.paid`, `payment.failed`, `payment_intent.succeeded`, `payment_intent.payment_failed`. Copy the signing secret into `PAYMONGO_WEBHOOK_SECRET`.
6. **Hook up your custom domain** — Vercel → Settings → Domains → add the domain. Set `NEXT_PUBLIC_APP_URL` to match. PayMongo's redirect URLs and our `success_url` / `cancel_url` are derived from this — webhooks **will not** arrive at a vercel.app preview URL once you switch.
7. **Migrate the prod database** — `npm run db:migrate` (= `prisma migrate deploy`) against the production `DATABASE_URL`. The Phase 7.1 migration adds `User.paymongoIntentId` + `User.paymongoIntentExpires` and extends `PaymentProvider` with `PAYMONGO`. Idempotent — safe to re-run.
8. **Flip to live** — replace test keys with live keys in the deploy env, redeploy. Smoke test:
   - Open `/dashboard/billing`, click *Pay via GCash · Operator* → should redirect to `https://gcash.app.link/...`
   - Authorise in the GCash app → return to `/dashboard/billing?checkout=success&provider=paymongo`
   - Within ~30s the webhook should land and the User row should flip to `OPERATOR` with `subscriptionStatus=active`
   - Inspect `WebhookEvent` for the corresponding `done` row (proves idempotency claim worked)
9. **Set the cron secret** — Vercel auto-injects `CRON_SECRET` for Vercel Cron. If you're running on a different host wire it manually; confirm `/api/cron/payment-expiry` returns `{ ok: true, scanned: 0, ... }` when called with the bearer header.

If anything 503s with `paymongo_not_configured`, double-check the **secret** key is `sk_*` not `pk_*` — easy mistake, identical naming, opposite roles.

---

## License

UNLICENSED · all rights reserved (placeholder until commercial structure is decided).
