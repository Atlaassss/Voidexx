import type { Metadata } from "next";
import { PageShell } from "../_PageShell";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Phase-by-phase shipping log for Voidexx.",
};

const ENTRIES = [
  {
    phase: "Phase 7.2",
    date: "May 23, 2026",
    title: "Button audit cleanup",
    bullets: [
      "Global toast layer + brand-styled HUD chip surface.",
      "10 stub pages — Terms, Privacy, Security, DPA, Changelog, Roadmap, About, Careers, Press.",
      "Settings preference toggles now real `<button role=\"switch\">` with localStorage state.",
      "Topbar bell → notification popover; ⌘K search → command palette stub.",
      "Journal — search input + Filters/Tags wired to client-side filter.",
      "Automation Disconnect surfaces `demo: true` via toast and splices the row in-memory.",
      "Admin + Costs swallowed errors replaced with inline error UI.",
    ],
  },
  {
    phase: "Phase 7.1",
    date: "May 23, 2026",
    title: "PayMongo billing rail",
    bullets: [
      "GCash · Maya · GrabPay redirect-flow checkout via `/api/billing/checkout` (provider=paymongo).",
      "Signed webhook at `/api/billing/paymongo/webhook` with HMAC-SHA256 verification + 5min tolerance.",
      "Hourly `/api/cron/payment-expiry` sweeps abandoned PaymentIntents.",
      "Marketing pricing — USD↔PHP currency toggle.",
    ],
  },
  {
    phase: "Phase 7",
    date: "May 23, 2026",
    title: "Growth foundation",
    bullets: [
      "Referrals + affiliates · `/r/<code>` first-touch attribution.",
      "SEO — sitemap, robots, OG image, full metadata graph.",
      "MDX blog with two seed posts.",
      "Transactional email (Resend) — welcome / autopsy-ready / plan-changed.",
    ],
  },
  {
    phase: "Phase 6",
    date: "May 23, 2026",
    title: "Admin + observability",
    bullets: [
      "Admin route group with role gate + audit log.",
      "Webhook idempotency table (Stripe + PayMongo).",
      "Live order placement with TOTP consent gate.",
      "Vercel Cron — quota reset + payment expiry.",
      "Structured JSON logger.",
    ],
  },
  {
    phase: "Phase 5",
    date: "May 23, 2026",
    title: "Exchange wiring",
    bullets: [
      "BingX REST adapter + AES-256-GCM credential vault.",
      "Risk engine — daily-loss / max-concurrent / tilt cool-down.",
    ],
  },
  {
    phase: "Phase 4",
    date: "May 23, 2026",
    title: "Stripe billing",
    bullets: [
      "Checkout + webhook + customer portal.",
      "Plan SSOT in `lib/billing/plans.ts`.",
    ],
  },
  {
    phase: "Phase 3",
    date: "May 22, 2026",
    title: "AI engine v1",
    bullets: [
      "gpt-4o vision + verdict pipeline with NDJSON streaming.",
      "Deterministic 0–100 scorer.",
      "Four hand-crafted demo archetypes.",
    ],
  },
  {
    phase: "Phase 2",
    date: "May 22, 2026",
    title: "Auth + storage",
    bullets: [
      "Clerk middleware-protected `/dashboard` + APIs.",
      "Presigned S3/R2 uploads.",
      "Prisma persistence with demo-mode fallback.",
    ],
  },
  {
    phase: "Phase 1",
    date: "May 22, 2026",
    title: "Foundation",
    bullets: [
      "\"Jailbroken Terminal\" visual system.",
      "Marketing site, dashboard shell, autopsy interaction.",
      "Schemas + typed API contracts.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <PageShell
      eyebrow="Resources · Changelog"
      title="Shipped."
      italic="In order. With dates."
    >
      <ul className="!space-y-10">
        {ENTRIES.map((e) => (
          <li
            key={e.phase}
            className="!pl-6 !before:content-none border-l-2 border-signal-cyan/40"
          >
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-[11px] uppercase tracking-widest2 text-signal-cyan">
                {e.phase}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                {e.date}
              </span>
            </div>
            <h2 className="!mt-1">{e.title}</h2>
            <ul className="!mt-3 !space-y-1.5 text-[14px]">
              {e.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
