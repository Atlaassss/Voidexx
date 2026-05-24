---
inclusion: always
---

# VOIDEXX — Project handoff (Phase 9 — pivot + finalize)

> Read this whole file before doing anything. It replaces the need to re-derive
> the project from PRs and code archaeology. After reading you should be able
> to walk to the right files and start coding.

---

## TL;DR — what you're building

**Voidexx** is an AI Trade Autopsy SaaS. Users upload a screenshot of a
losing trade. The engine reads the chart, decodes the smart-money mechanic
that took their stop, scores their psychology, and writes a forensic
autopsy a prop-firm desk would. Next.js 15 / TypeScript / Postgres / OpenAI
gpt-4o. Aesthetic codename **"Jailbroken Terminal"**.

**Phase 9 mandate (this session's pivot):**

1. **Remove the entire automation surface** — exchange wiring, BingX
   adapter, AES-GCM credential vault, risk engine, order placement,
   Automation page, dashboard nav entry. Trading-execution features go
   away completely. Keeps the product focused on *autopsy* not *order
   placement*.
2. **PayMongo-only billing** — Stripe is removed. PayMongo handles
   GCash · Maya · GrabPay · DOB · BillEase · cards (PH-issued and
   international via the card method). The currency-toggle on marketing
   becomes USD-display + PHP-charge (FX shown), since PayMongo only
   settles PHP.
3. **New pricing tiers**:
   - Recon (free): **$0**
   - Operator: **$15.88** USD ≈ **₱889.28** (88928 centavos)
   - Desk: **$24.88** USD ≈ **₱1,393.28** (139328 centavos)
4. **Fully functional client-ready ship** — every button works, no
   silent demo failures, all phases' issues resolved.

**Preferred path:** rework existing code surgically (don't nuke + remake).
The current `feat/voidexx-phase-8-features` branch is the most-complete
state — branch off it.

---

## Branch state on the GitHub remote

| Branch | Where it ends | Merged? |
|---|---|---|
| `main` | Phase 5 merge (`8047815`) | ✓ |
| `feat/voidexx-phase-7-1-paymongo-v2` | Phase 7.1 (PayMongo billing) PR #8 | merged into stacked feat |
| `feat/voidexx-phase-7-2-buttons` | Phase 7.2 (button audit + dismissible banner) PR #9 | open |
| `feat/voidexx-phase-8-features` | Phase 8 (share links + admin user detail + tour + help widget) PR #11 | open |

**Phase 9 starting point:** branch off `feat/voidexx-phase-8-features` and
make ONE consolidation PR. Don't re-merge phases 6/7 to main — they're on
stacked feat branches that never landed and the diff history is confused.
Easier to ship Phase 9 as the consolidation that lands on main.

---

## Tech stack (all already wired)

```
Next.js 15.5  (app router, RSC, NDJSON streaming)
React 19
TypeScript 5.7  (strict, noUncheckedIndexedAccess off)
Tailwind 3.4    (custom palette + keyframes in tailwind.config.ts)
Framer Motion 11
lucide-react
Prisma 6.19   → Postgres (Supabase OK)
Clerk          (auth — middleware-protected /dashboard + APIs)
AWS S3 SDK     (presigned PUTs; Cloudflare R2 endpoint also supported)
OpenAI SDK     (gpt-4o vision + verdict, NDJSON streaming)
PayMongo       (PaymentIntent + PaymentMethod attach flow)
Resend         (transactional email)
@next/mdx      (file-based blog at content/blog/*.mdx)
zod
```

**Demo mode is the contract** — the app must boot with no env vars and
work end-to-end against mocks. Set env vars to graduate each subsystem.
Every subsystem has its own `env.<name>.enabled` flag in `lib/env.ts`.

---

## What ships (consolidated state at end of Phase 8, BEFORE Phase 9 cuts)

| Area | What's there |
|---|---|
| Marketing | `/` hero + animated terminal + ticker + 4-step demo + features grid + social proof + pricing + FAQ + footer |
| Stub pages | `/about` `/careers` `/changelog` `/contact` `/press` `/roadmap` `/legal/{terms,privacy,security,dpa}` |
| Blog | `content/blog/*.mdx` SSG, two seed posts, custom MDX styling |
| Auth | Clerk middleware-protected, themed sign-in/up, conditional `<UserButton />` |
| Dashboard chrome | Sidebar (lg+) + MobileNav + Topbar w/ command palette (⌘K) + bell popover |
| Command Center | KPIs + sparklines + equity curve + AI directives + recent autopsies |
| Trade Autopsy | Drag-drop ingest + presigned upload + 4-stage NDJSON pipeline + report panel |
| AI engine | gpt-4o vision pass + verdict pass + deterministic 0–100 scorer + cost-tracked + 4 mock archetypes when no key |
| Journal | Search + Filters dropdown + Tags multi-select + chip filters + counter |
| Analytics / Psychology / Leaderboards / Learn | Each page has rich content; Learn has tracks + AI tutor disabled-with-Phase-8-chip |
| Billing | Dual-rail (Stripe + PayMongo) — **drop Stripe in Phase 9** |
| Exchange / Automation | BingX wiring, AES-GCM vault, risk engine, order placement w/ TOTP — **delete entirely in Phase 9** |
| Admin | Role-gated route group, user list, user-detail panel `/dashboard/admin/users/[id]` (plan switcher + bonus grants + suspend), audit log, AI cost dashboard |
| Webhook idempotency | `WebhookEvent` table, claim-before-process |
| Cron | `/api/cron/quota-reset` (monthly) + `/api/cron/payment-expiry` (hourly) |
| Referrals | 8-char code, `/r/[code]` first-touch attribution, dashboard with copy/share/tier-progress |
| SEO | Sitemap + robots + dynamic OG image + full metadata graph |
| Email | Resend wrapper, welcome + autopsy-ready + plan-changed templates |
| Share links | `/share/[shareId]` public read-only autopsies, `<ShareAutopsyButton />` on report |
| Onboarding tour | First-visit modal in dashboard, replayable from help widget |
| Help widget | FAB bottom-right, restart tour + shortcuts + blog + email support |
| Toast layer | `lib/toast.ts` + `<Toaster />`, four tones (info/success/error/demo) |
| Demo banner | Dismissible × per-session, hide hard via `NEXT_PUBLIC_HIDE_DEMO_BANNER=1` |

**~58 routes total. Build green at last commit (`d142bfb`).**

---

## Phase 9 — concrete delete + change list

### A. Delete the automation surface

```
DELETE src/lib/exchange/                        # bingx.ts, risk.ts, order.ts, types.ts, crypto helpers
DELETE src/lib/crypto.ts                         # AES-GCM vault — only used by exchange
DELETE src/app/api/exchange/                     # connect, [id], consent, order routes
DELETE src/app/dashboard/automation/             # page.tsx + AutomationClient.tsx
```

**Schema (`prisma/schema.prisma`)**: drop these models + enums:
- `model ExchangeConnection`
- `model AutomationLog`
- `enum Venue`
- `enum AutomationKind`
- `enum LogLevel`
- Remove `User.exchanges` and `User.automationLogs` relations
- Remove `User.twoFactorSecret` + `User.twoFactorOn` (only used for order consent)

**New migration** at `prisma/migrations/20260526000001_phase_9_drop_automation/migration.sql`:
```sql
DROP TABLE IF EXISTS "AutomationLog" CASCADE;
DROP TABLE IF EXISTS "ExchangeConnection" CASCADE;
DROP TYPE IF EXISTS "Venue";
DROP TYPE IF EXISTS "AutomationKind";
DROP TYPE IF EXISTS "LogLevel";
ALTER TABLE "User" DROP COLUMN IF EXISTS "twoFactorSecret";
ALTER TABLE "User" DROP COLUMN IF EXISTS "twoFactorOn";
```

**Sidebar** (`src/components/dash/SidebarNav.tsx`): remove "Automation" entry.
**Mobile nav** (`src/components/dash/MobileNav.tsx`): remove if present.
**Topbar** (`src/components/dash/Topbar.tsx`): remove the `Status icon={Wifi} label="Exch" value="BingX"` chip.
**TopbarSearch** (`src/components/dash/TopbarSearch.tsx`): remove `cmd-auto` from `COMMANDS`.
**Settings** (`src/app/dashboard/settings/page.tsx`): drop the Exchange status row.
**DemoBanner** (`src/components/DemoBanner.tsx`): drop the `exchange` token.
**env.ts** (`src/lib/env.ts`): drop the `exchange` block + the BINGX_* / EXCHANGE_ENCRYPTION_KEY reads + the production-warn for them.
**.env.example**: drop EXCHANGE_ENCRYPTION_KEY, BINGX_BASE_URL, BINGX_API_KEY, BINGX_API_SECRET.
**README**: drop the Phase 5 section, drop "Exchange wiring" status row, drop exchange env table row.

### B. PayMongo-only billing

```
DELETE src/lib/billing/stripe.ts
DELETE src/lib/billing/customer.ts                # getOrCreateStripeCustomer
DELETE src/app/api/billing/portal/                # Stripe customer portal
DELETE src/app/api/billing/webhook/               # Stripe webhook (KEEP paymongo/webhook)
```

**Schema**: drop `User.stripeCustomerId`, `User.stripeSubscriptionId`, `User.subscriptionStatus`. Drop `STRIPE` and `PAYPAL` from `PaymentProvider` enum. Keep `PAYMONGO` (and `GCASH`/`MAYA` for legacy though they're never written).

```sql
-- prisma/migrations/20260526000002_phase_9_paymongo_only/migration.sql
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "stripeCustomerId",
  DROP COLUMN IF EXISTS "stripeSubscriptionId",
  DROP COLUMN IF EXISTS "subscriptionStatus";

-- Postgres can't drop enum values cleanly without recreating the type.
-- Easier: leave STRIPE/PAYPAL in the enum, just stop writing them.
```

**`src/lib/billing/plans.ts`** — strip Stripe entirely:
```ts
export interface PlanDef {
  id: Plan;
  name: string;
  priceUsd: number;       // for marketing display
  pricePhp: number;       // computed at FX = 56
  paymongoCentavos: number | undefined;
  blurb: string;
  features: string[];
}
const operatorUsd = 15.88;
const deskUsd = 24.88;
// PLANS table: RECON $0 ₱0, OPERATOR $15.88 ₱889.28 (88928 centavos), DESK $24.88 ₱1,393.28 (139328 centavos)
// Drop stripePriceId entirely. Drop planFromStripePriceId. Drop isPurchasable.
// Keep planFromPaymongoMetadata + isPurchasableViaPaymongo.
```

**`src/app/api/billing/checkout/route.ts`** — drop `provider` field; assume PayMongo. Body becomes `{ plan, method }`. Drop the Stripe path entirely. Keep ensureDbUser + the PaymentIntent → PaymentMethod → attach flow.

**`src/app/dashboard/billing/BillingClient.tsx`** — drop the Stripe section + the "Manage subscription" button (Stripe-only). Keep the GCash / Maya / GrabPay chip selector + the per-plan buttons. Update labels: no more "Pay via card · Stripe · USD".

**`src/app/dashboard/billing/page.tsx`** — drop `paymongoEnabled` prop split, change subline to `PayMongo · live (PHP)` / `PayMongo · demo`. Remove the "Manage subscription" panel.

**`src/components/marketing/Pricing.tsx`** — keep the USD↔PHP currency toggle (UX nice). USD shows $15.88 / $24.88. PHP shows ₱889 / ₱1,393. Footer text always says "PayMongo · GCash · Maya · GrabPay · cards · 14-day refund".

**`src/lib/env.ts`** — delete the entire `stripe` block. Update `isFullyConfigured` to drop the `env.stripe.enabled || env.paymongo.enabled` clause and just check `env.paymongo.enabled`. Update production warning: drop STRIPE checks, drop "or PAYMONGO_SECRET_KEY" alternative. Just `PAYMONGO_SECRET_KEY` required.

**`.env.example`** — delete STRIPE_* block entirely. Keep PAYMONGO_*. Adjust comment text to remove dual-rail references.

**`src/components/DemoBanner.tsx`** — billing missing only if `!env.paymongo.enabled`.

**`src/app/dashboard/settings/page.tsx`** — billing field becomes `env.paymongo.enabled ? "PayMongo · live (PH)" : "Demo (no checkout)"`. Drop the dual-rail composer.

**`src/components/Toaster.tsx`** + everything else — no changes needed.

**README** — biggest doc edit. Drop Stripe references everywhere, drop the dual-rail story, simplify the Phase 4 entry to "billing v0 (Stripe — removed in Phase 9)", drop the launch checklist's Stripe steps, focus the launch checklist on PayMongo only (signup → activate → bank → API keys → webhook → custom domain → migrate prod DB → flip to live).

### C. Pricing flip

Already mostly covered above. Three places to verify:
1. `src/lib/billing/plans.ts` — `operatorUsd = 15.88`, `deskUsd = 24.88`.
2. `src/components/marketing/Pricing.tsx` — `TIERS` array hardcoded prices: `$15.88` / `$24.88` and `₱889` / `₱1,393`.
3. `src/components/dash/OnboardingTour.tsx` — Step 03 mentions "Operator (USD via Stripe, ₱1,344 via GCash...)" — update to "Operator ($15.88 / ₱889 via GCash / Maya / GrabPay)".

### D. Quota math (deferred from Phase 8)

In `src/lib/quota.ts`, when checking if user is over the free limit, **subtract `user.bonusAutopsies` from the count first**. So a free user with 5 freeUsageMonth + 5 bonusAutopsies has effectively 10 / 5 (5 bonus left). Decrement bonusAutopsies before incrementing freeUsageMonth. This was promised in Phase 8 and not delivered — Phase 9 must.

---

## Build order for next session

1. **Branch**: `git checkout -b feat/voidexx-phase-9-pivot feat/voidexx-phase-8-features`
2. **Schema first** — edit `prisma/schema.prisma`, write the two migrations, run `npx prisma generate`. Confirm typecheck still passes (most code references will fail; that's the next step).
3. **Delete the automation files** in one big sweep — `git rm -r src/lib/exchange src/lib/crypto.ts src/app/api/exchange src/app/dashboard/automation`. Update Sidebar/MobileNav/Topbar/TopbarSearch/Settings/DemoBanner/env.ts.
4. **Delete Stripe** — `git rm src/lib/billing/stripe.ts src/lib/billing/customer.ts && git rm -r src/app/api/billing/portal src/app/api/billing/webhook`. Update plans.ts (drop Stripe, new prices), env.ts (drop block), checkout/route.ts (drop dispatch, paymongo only), BillingClient.tsx, billing/page.tsx, marketing/Pricing.tsx, DemoBanner, settings/page.tsx, OnboardingTour copy.
5. **Quota math** — edit `src/lib/quota.ts` to subtract bonusAutopsies first.
6. **README** — drop Phase 5 (automation) entry, drop dual-rail mentions, simplify launch checklist to PayMongo-only.
7. **`npx tsc --noEmit`** — fix every error. Most should be missing-import shouts; resolve by deleting the orphaned imports.
8. **`npm run build`** — should land at ~50 routes (was 58, removing 8: api/exchange/* (4) + dashboard/automation (1) + api/billing/portal (1) + api/billing/webhook (1) + … give or take).
9. **`bash scripts/smoke-phase-8.sh`** — should still pass (with adjustments if it referenced automation/Stripe).
10. **Manual probe**: spin up `next start` and click through dashboard pages. Specifically:
    - `/dashboard/billing` shows PayMongo only with new prices
    - `/dashboard/automation` 404s
    - `/dashboard/admin/users/[id]` works
    - `/share/[id]` works
    - Onboarding tour wording matches new pricing
11. **Push + open PR titled** `feat(phase-9): drop automation, PayMongo-only billing, new pricing tiers ($0/$15.88/$24.88)`. Stack on `feat/voidexx-phase-8-features` if API requires it; otherwise target `main`.

If the GitHub create-PR API rejects with "no common history", the cleanest fix is `git rebase --onto $(git rev-parse origin/main) feat/voidexx-phase-8-features feat/voidexx-phase-9-pivot` — see what happened in PR #8 for prior art.

---

## PayMongo specifics (since billing's now the focus)

- **Register**: dashboard.paymongo.com → sign up → KYC (email + SMS verify, liveness, gov ID, face match) → KYB (legal name, TIN, business docs per entity type — DTI for sole prop, SEC for corp). Activation 1–3 banking days.
- **API keys**: Developers → API Keys. `sk_test_*` for sandbox, `sk_live_*` after activation + verified bank account. Public key (`pk_*`) is browser-safe; needed for Phase 7.2's card form (not yet shipped).
- **Webhook secret**: Developers → Webhooks → New endpoint at `https://YOUR-DOMAIN/api/billing/paymongo/webhook`. Subscribe to `payment.paid`, `payment.failed`, `payment_intent.succeeded`, `payment_intent.payment_failed`. Copy signing secret to `PAYMONGO_WEBHOOK_SECRET`.
- **Money flow**: customer pays → settles into PayMongo Wallet (cards 3 banking days, e-wallets 2 banking days) → you initiate payout to bank (InstaPay real-time ≤ ₱50K, PESONet next-banking-day larger). First payout has 7-day hold for new merchants. PayMongo doesn't charge for payouts — only the per-transaction processing fee at customer payment time.
- **Settlement is NOT real-time**: this is the most-asked question. Funds clear at PayMongo first, then you sweep them to bank.
- **Code already wired**: `src/lib/billing/paymongo.ts` has `paymongoFetch<T>`, `createPaymentIntent`, `createEwalletPaymentMethod`, `attachPaymentMethod`, `getPaymentIntent`, `verifyWebhookSignature` (HMAC-SHA256, 5min tolerance, constant-time compare). `/api/cron/payment-expiry` (hourly) clears stale `User.paymongoIntentId` for the "user closed the tab" case.

---

## Aesthetic / brand (don't deviate)

Codename **"Jailbroken Terminal"**. Pure-black canvas with deep radial gradients (violet 8%, cyan 5%). Signal palette: red `#ff2e3b` · green `#00ff9d` · amber `#ffb000` · violet `#7b2bff` · cyan `#00e5ff`. Crosshair brackets, scan lines, fine grid, ticker tape, monospace HUD readouts.

Typography: **Anton** (display, condensed industrial), **Geist** (body, neutral), **JetBrains Mono** (data/HUD), **Instrument Serif** (italic accents — used sparingly).

**Never** use: purple-on-white gradients, Inter, Roboto, Space Grotesk, glassmorphism-by-default. The brand explicitly avoids generic SaaS aesthetics.

CSS conventions: `font-display` for headlines, `font-mono` for HUD, `font-serif italic` for editorial accents. `.brackets .b1 .b2` decorations on cells. `.cell .cell-header` for panels. Animations: `animate-scan`, `animate-rise`, `animate-pulse-dot`, `animate-blink`, `animate-grid-drift`. All defined in `tailwind.config.ts`.

---

## Demo-mode contract (preserve through Phase 9)

The app boots and works end-to-end with NO env vars. Every subsystem has a sentinel: when its env is missing, the route returns `{ ok: true, demo: true }` (200) for writes or a deterministic mock for reads. The client should turn `demo: true` into an amber toast via `lib/toast.ts` rather than silently appearing to succeed.

`scripts/smoke-phase-8.sh` is the canonical smoke test. Keep it green through Phase 9.

`NEXT_PUBLIC_HIDE_DEMO_BANNER=1` hides the yellow strip + inline demo notices (via `lib/preview.ts`) for client previews / staging deploys.

---

## Past phases (1-line each, for orientation only)

- **PR #1 (Phase 1)** — foundation. Visual system, marketing site, dashboard shell, autopsy interaction, schemas, typed contracts.
- **PR #2 (Phase 2)** — Clerk auth + S3/R2 presigned uploads + Prisma persistence. Demo-mode contract established.
- **PR #3 (Phase 3)** — AI engine v1. gpt-4o vision + verdict, NDJSON streaming, deterministic scorer, 4 mock archetypes.
- **PR #4 (Phase 4)** — Stripe billing. Checkout, webhook, customer portal. **REMOVED in Phase 9.**
- **PR #5 (Phase 5)** — exchange wiring. BingX, AES-GCM vault, risk engine. **REMOVED in Phase 9.**
- **PR #6 (Phase 6)** — admin panel, webhook idempotency, live order placement, cron, observability, retry UX. *Order placement removed in Phase 9; admin panel kept.*
- **PR #7 (Phase 7)** — referrals, SEO, MDX blog, transactional email.
- **PR #8 (Phase 7.1)** — PayMongo billing rail. *Now the only billing rail in Phase 9.*
- **PR #9 (Phase 7.2)** — button audit cleanup (27 BROKEN/SILENT-FAIL surfaces fixed), 10 stub pages, dismissible demo banner, toast layer.
- **PR #11 (Phase 8)** — public share links, admin user-detail panel with bonus grants + suspend, onboarding tour, help widget.

---

## How the user (Atlaassss) likes responses

- **Terse and confident.** Don't pad. Don't preamble.
- **Show the work** — actual file paths, actual SHAs, actual commit messages. Not vibes.
- **Smoke-test what you ship.** `scripts/smoke-*.sh` is the convention.
- **Two clear sections per reply when there's a feature build**: what shipped (technical + commit ref) and what was deferred (with reason).
- **No emojis in code or content** unless explicitly asked.
- **Sub-agents for context-gathering** only when starting on unfamiliar code; don't over-delegate.
- **Workflow note**: PRs are stacked. PR titles are `feat(phase-X.Y): <one-line summary>`. Commit messages are detailed but tight.
- The user knows trading domain deeply (ICT / SMC concepts). Don't re-explain liquidity grabs etc.
- **Do not** delete admin features, referrals, blog, share links, onboarding tour, help widget, command palette, toast layer, journal filters. These are valuable UX work the user paid for in tokens. Phase 9 is *targeted* removal of automation + Stripe only.

---

## File map at handoff (key files only)

```
src/
  app/
    layout.tsx                              # Toaster + DemoBanner mount, suppressHydrationWarning
    page.tsx                                # marketing
    (legal)/                                # 10 stub pages — keep
    api/
      autopsy/route.ts                      # NDJSON streaming pipeline
      autopsy/[id]/route.ts                 # read persisted report
      autopsy/[id]/share/route.ts           # Phase 8 — share-link toggle
      billing/
        checkout/route.ts                   # PHASE 9: drop stripe path, paymongo only
        portal/route.ts                     # PHASE 9: DELETE
        webhook/route.ts                    # PHASE 9: DELETE (this is the stripe webhook)
        paymongo/webhook/route.ts           # KEEP — paymongo webhook
      cron/{quota-reset,payment-expiry}/    # KEEP both
      exchange/                             # PHASE 9: DELETE entirely
      admin/{audit,costs,stats,users}/      # KEEP all
      referrals/me/                         # KEEP
      uploads/route.ts                      # presigned PUT
      health/route.ts
      trades/route.ts
    dashboard/
      layout.tsx                            # Sidebar + MobileNav + OnboardingTour + HelpWidget
      page.tsx                              # Command Center
      upload/{page.tsx,UploadClient.tsx}    # autopsy ingest + ShareAutopsyButton
      automation/                           # PHASE 9: DELETE entirely
      billing/{page.tsx,BillingClient.tsx}  # PHASE 9: simplify to paymongo-only, new prices
      admin/                                # KEEP (page.tsx, AdminClient, costs/, users/[id]/)
      referrals/                            # KEEP
      journal/                              # KEEP (search + filters work)
      learn/                                # KEEP
      settings/                             # KEEP, drop exchange row
      analytics/, psychology/, leaderboards/  # KEEP all
    share/[shareId]/                        # KEEP — Phase 8 public read-only
    sign-in/, sign-up/                      # Clerk shells
    blog/, opengraph-image, robots, sitemap, r/[code]/  # KEEP all
  components/
    DemoBanner.tsx, DemoBannerClient.tsx    # KEEP, drop "exchange" token
    Toaster.tsx                             # KEEP
    marketing/                              # KEEP all (TopNav, Hero, TerminalCard, Pricing — UPDATE prices, Footer, AdRail, etc.)
    dash/
      Sidebar.tsx, SidebarNav.tsx           # KEEP — drop Automation entry
      MobileNav.tsx                         # KEEP — drop if has automation
      Topbar.tsx, TopbarSearch.tsx, TopbarBell.tsx, TopbarClock.tsx, UserChip.tsx
      Panel.tsx, Sparkline.tsx
      OnboardingTour.tsx, HelpWidget.tsx    # KEEP — Phase 8
      ShareAutopsyButton.tsx                # KEEP — Phase 8
  lib/
    env.ts                                  # PHASE 9: drop stripe + exchange blocks
    auth.ts                                 # KEEP (requireUser, ensureDbUser, getSessionUser)
    db.ts                                   # KEEP (lazy Prisma singleton)
    storage.ts                              # KEEP (S3 presigner)
    quota.ts                                # PHASE 9: subtract bonusAutopsies first
    validation.ts, utils.ts
    toast.ts                                # KEEP — pub/sub bus
    preview.ts                              # KEEP — previewMode flag
    crypto.ts                               # PHASE 9: DELETE
    admin.ts                                # KEEP — requireAdmin + auditLog
    referrals.ts                            # KEEP
    webhook-idempotency.ts                  # KEEP
    logger.ts                               # KEEP
    api/contracts.ts                        # KEEP — typed request/response
    ai/                                     # KEEP all (orchestrator, vision, verdict, scoring, prompts, types, openai, imageFetch, mock)
    billing/
      plans.ts                              # PHASE 9: drop stripe fields, new prices
      stripe.ts                             # PHASE 9: DELETE
      customer.ts                           # PHASE 9: DELETE (getOrCreateStripeCustomer)
      paymongo.ts                           # KEEP
    email/                                  # KEEP all (welcome, autopsy-ready, plan-changed templates)
    exchange/                               # PHASE 9: DELETE entirely
prisma/
  schema.prisma                             # PHASE 9: drop ExchangeConnection, AutomationLog, enums; drop User.stripe* fields
  migrations/
    20260522120000_init/
    20260523000001_billing/                 # adds Stripe columns — leave alone
    20260523000002_quota_period/
    20260523000003_exchange_cache/          # leave alone
    20260523000004_admin_audit_webhook_idempotency/
    20260524000001_referrals/
    20260524000002_paymongo/
    20260525000001_phase_8/
    20260526000001_phase_9_drop_automation/  # NEW
    20260526000002_phase_9_paymongo_only/    # NEW
scripts/
  smoke.sh, smoke-phase-8.sh, smoke-banner.sh, check-adrail.sh
content/blog/*.mdx                          # KEEP both seed posts
mdx-components.tsx
.env.example                                # PHASE 9: drop stripe + exchange blocks
README.md                                   # PHASE 9: rewrite billing/automation sections
```

---

## Open punch-list (carry into Phase 9 or punt)

- [ ] **Quota math** — subtract bonusAutopsies first (promised in Phase 8, not delivered).
- [ ] **CSV export of journal** — small, low priority.
- [ ] **Live admin activity feed** (poll latest autopsies + payments).
- [ ] **Refund flow** in admin user-detail (Stripe refund — moot after Phase 9; PayMongo refund via API).
- [ ] **Phase 7.5 (deferred forever?)** — Discord OAuth bridge + web push notifications. Ignore unless user asks.

---

## Done? Then output this in the PR description

```
Phase 9 — pivot + finalize.

DELETED
- Automation: src/lib/exchange, src/app/api/exchange, src/app/dashboard/automation, src/lib/crypto.ts
- Stripe: src/lib/billing/{stripe,customer}.ts, src/app/api/billing/{portal,webhook}
- Schema: ExchangeConnection, AutomationLog, Venue/AutomationKind/LogLevel enums, User.{stripeCustomerId, stripeSubscriptionId, subscriptionStatus, twoFactorSecret, twoFactorOn}
- Env: BINGX_*, EXCHANGE_ENCRYPTION_KEY, STRIPE_*

CHANGED
- Pricing: $0 / $15.88 / $24.88 (was $0 / $24 / $79)
- /api/billing/checkout: PayMongo-only, no provider dispatch
- BillingClient: removed Stripe section + manage-subscription button
- Marketing Pricing: USD ↔ PHP toggle preserved, prices updated
- README: dropped Stripe + automation, simplified to PayMongo launch checklist
- Quota: subtracts bonusAutopsies before freeUsageMonth (Phase 8 carryover)

VERIFIED
- npx tsc --noEmit clean
- npm run build clean (~50 routes)
- scripts/smoke-phase-8.sh green
- Manual: /dashboard/billing shows new prices, /dashboard/automation 404s, share + admin user-detail unchanged
```

That's it. Ship it.
