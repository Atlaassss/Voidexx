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
| Command Center | ✅ | KPIs w/ sparklines, equity curve, AI directives, trap tracker, recent autopsies |
| Trade Autopsy upload | ✅ | Drag-drop, presigned upload w/ progress, 4-phase pipeline, full report from `/api/autopsy` |
| Journal / Analytics / Psychology / Automation / Leaderboards / Learn / Settings / Billing | ✅ | Each route has rich content, not blank stubs |
| Prisma schema | ✅ | Users, trades, autopsies, journals, psych, exchanges, payments, automation logs, ads, referrals |
| Initial migration SQL | ✅ | `prisma/migrations/20260522120000_init/migration.sql`, ready for `prisma migrate deploy` |
| Auth (Clerk) | ✅ | Middleware-protected dashboard + API, themed `/sign-in` & `/sign-up`, `<UserButton />` in topbar |
| Demo mode | ✅ | App boots without ANY env vars; banner declares which subsystems are unwired |
| Storage (S3 / R2) | ✅ | Presigned PUT issued by `/api/uploads`; works with AWS S3 or Cloudflare R2 endpoint |
| AI engine v1 | ✅ | gpt-4o vision + verdict passes, deterministic scorer, NDJSON streaming, 4 archetype mocks |
| API surface | ✅ | `/api/uploads`, `/api/autopsy` real (auth + zod + quota + DB persistence + streaming); `/api/autopsy/[id]` reads persisted reports |
| Real AI vision pipeline | ✅ | Streams progress over NDJSON; cost-tracked in `Autopsy.costMicros` |
| Stripe billing | ✅ | Real Checkout, webhook → plan upgrade, customer portal, cost-tracked Payment rows; demo-mode shows `Stripe · demo` chip |
| Exchange wiring | ✅ | BingX read-only API connect/probe/refresh; AES-256-GCM credential vault; risk engine primitives; automation dashboard wired to live balance |
| GCash / Maya / PayPal | ⏳ | Stripe handles the global market; PH-specific rails via Xendit — Phase 7 |
| Live order placement | ✅ | 2FA consent gate, risk engine check, paper/live split, audit-logged |
| Admin panel | ✅ | Role-gated route group, user management, audit log, AI cost dashboard |
| Webhook idempotency | ✅ | `WebhookEvent` table, claim-before-process pattern on Stripe webhook |
| Vercel Cron (quota reset) | ✅ | Monthly RECON quota bulk reset via `/api/cron/quota-reset` |
| Structured logging | ✅ | JSON-line prod logger, service-scoped, level-gated |
| Autopsy retry UX | ✅ | Retry button on pipeline failure, re-runs without re-upload |

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

**Phase 6 — Admin + analytics**
- `(admin)` route group, user / subscription / ad management, AI cost dashboard, support tickets.

**Phase 7 — Growth**
- Referrals, affiliate links, blog (MDX), SEO, push notifications, Discord OAuth + webhook bridge.

---

## License

UNLICENSED · all rights reserved (placeholder until commercial structure is decided).
