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
| API surface | ✅ | `/api/uploads`, `/api/autopsy` real (auth + zod + quota + DB persistence); billing/exchange/trades stubbed |
| Real AI vision pipeline | ⏳ | Worker design notes below — Phase 3 |
| Exchange integrations | ⏳ | BingX first; wiring scaffold in `api/exchange/*` — Phase 5 |
| Stripe / PayPal / GCash / Maya | ⏳ | Webhook + checkout stubs in place — Phase 4 |
| Admin panel | ⏳ | Schema-ready, route group `(admin)` not yet built — Phase 6 |

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
| Database | `DATABASE_URL` (Postgres / Supabase) | `/api/autopsy` persists `Trade` + `Autopsy` rows; quota counter ticks on `User.freeUsageMonth` |
| Storage | `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (+ optional `S3_ENDPOINT` for R2) | Upload page hits real presigned PUT URLs; uploads stream directly browser → S3 with progress |

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

## AI pipeline design (planned)

```
[ Client ] -- presigned PUT --> [ S3/R2 ]
[ Client ] -- POST /api/autopsy { uploadId } --> [ web ]
[ web ] enqueues job --> [ Redis (BullMQ) ]
                              |
                  ┌-----------┴-----------┐
                  v                       v
       [ Vision worker (TS) ]    [ Structure worker (Py) ]
       OpenAI vision API         pandas-ta + custom ICT/SMC rules
                  └---------┬-----------┘
                            v
              [ Aggregator + Verdict (TS) ]
              merges JSON + writes summary
              persists Trade + Autopsy
                            v
                 [ web ] streams result
```

Cost guard: every Autopsy row stores `costMicros`. Free tier hard-caps at 5/month
via `User.freeUsageMonth`; reset by a daily cron.

Vision prompt principles:
- Output strict JSON, never prose
- Extract: candles[], range hi/lo, BOS/CHOCH lines, OBs, FVGs, sweeps, equal-h/l
- One call → structure pass; second call → narrative pass over the JSON

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

**Phase 3 — AI engine v1**
- Vision worker, structure worker, aggregator, persistence, real cost tracking. Replace the deterministic verdict body in `/api/autopsy` with the real pipeline.

**Phase 4 — Billing live**
- Stripe Checkout, webhook → plan upgrade, GCash & Maya via Xendit, refund flow.

**Phase 5 — Exchange wiring**
- BingX first (read-only → paper → live), encrypted credential vault, daily-loss cap engine, tilt lockouts.

**Phase 6 — Admin + analytics**
- `(admin)` route group, user / subscription / ad management, AI cost dashboard, support tickets.

**Phase 7 — Growth**
- Referrals, affiliate links, blog (MDX), SEO, push notifications, Discord OAuth + webhook bridge.

---

## License

UNLICENSED · all rights reserved (placeholder until commercial structure is decided).
