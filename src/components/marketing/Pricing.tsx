"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

type Currency = "USD" | "PHP";

interface Tier {
  name: string;
  /** Pre-discount price string, rendered with strikethrough. null = free / no discount. */
  originalPrices: Record<Currency, string | null>;
  /** Live price string. */
  prices: Record<Currency, { amount: string; sub: string }>;
  /** Pre-computed savings %, 0 means hide the badge. */
  discountPercent: number;
  blurb: string;
  features: string[];
  cta: string;
  highlight: boolean;
}

// Prices mirrored from src/lib/billing/plans.ts — kept in sync manually
// because this is a server-rendered marketing page and we don't want to
// pull the env-coupled PLANS dict into the marketing bundle. The
// flat-rate USD→PHP conversion is the same (×56) used in plans.ts.
//
// Phase 9: launch-discount pricing. The strikethrough originalPrices
// sit above the live prices and the green "Save NN%" badge sells the
// urgency without resorting to fake countdowns.
const TIERS: Tier[] = [
  {
    name: "Recon",
    originalPrices: { USD: null, PHP: null },
    prices: {
      USD: { amount: "$0", sub: "/forever" },
      PHP: { amount: "₱0", sub: "/forever" },
    },
    discountPercent: 0,
    blurb: "Run autopsies. Get a feel.",
    features: [
      "5 trade autopsies / month",
      "Basic structural read",
      "Auto journal (limited)",
      "Global market news (delayed)",
      "Ads enabled",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Operator",
    originalPrices: { USD: "$29", PHP: "₱1,624" },
    prices: {
      USD: { amount: "$15.88", sub: "/month" },
      PHP: { amount: "₱889", sub: "/month" },
    },
    discountPercent: 45, // floor((29 - 15.88) / 29 * 100)
    blurb: "For active retail traders.",
    features: [
      "Unlimited autopsies",
      "Full smart-money decoder",
      "Psychology + tilt guard",
      "Live global news (X · TV · wires)",
      "Priority queue · zero ads",
    ],
    cta: "Go Operator",
    highlight: true,
  },
  {
    name: "Desk",
    originalPrices: { USD: "$49", PHP: "₱2,744" },
    prices: {
      USD: { amount: "$24.88", sub: "/month" },
      PHP: { amount: "₱1,393", sub: "/month" },
    },
    discountPercent: 49, // floor((49 - 24.88) / 49 * 100)
    blurb: "Prop firms, teams, power users.",
    features: [
      "Everything in Operator",
      "Team dashboard (5 seats)",
      "API + webhooks",
      "Prop-firm constraint engine",
      "Dedicated AI mentor",
    ],
    cta: "Open desk",
    highlight: false,
  },
];

export function Pricing() {
  const [currency, setCurrency] = useState<Currency>("USD");

  return (
    <section id="pricing" className="relative border-b border-void-300/60 py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest3 text-signal-cyan">
          <span className="grid h-5 w-5 place-items-center border border-signal-cyan/60">05</span>
          <span>Pricing</span>
          <span className="h-px flex-1 bg-void-300/70" />
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="display-crush max-w-3xl text-5xl sm:text-7xl">
              Three tiers.
              <br />
              <span className="editorial text-signal-amber">Launch discount live.</span>
            </h2>
            <div className="mt-3 inline-flex items-center gap-2 border border-signal-green/50 bg-signal-green/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-signal-green">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal-green" />
              Founders pricing · save up to 49%
            </div>
          </div>

          {/* Currency toggle. Defaults to USD; PH visitors can flip to PHP
              and see the GCash/Maya prices that get charged on PayMongo. */}
          <div className="flex border border-void-300/60">
            <CurrencyButton
              active={currency === "USD"}
              onClick={() => setCurrency("USD")}
              label="USD"
              sub="card · global"
            />
            <CurrencyButton
              active={currency === "PHP"}
              onClick={() => setCurrency("PHP")}
              label="PHP"
              sub="GCash · Maya · GrabPay"
            />
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-px bg-void-300/70 lg:grid-cols-3">
          {TIERS.map((t, i) => {
            const p = t.prices[currency];
            const wasPrice = t.originalPrices[currency];
            return (
              <div
                key={i}
                className={`relative bg-void-0 p-8 transition ${
                  t.highlight ? "lg:-translate-y-2 lg:bg-void-50" : ""
                }`}
              >
                {t.highlight && (
                  <div className="absolute right-6 top-6 chip border-signal-green/60 bg-signal-green/10 text-signal-green">
                    Most picked
                  </div>
                )}
                <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                  Tier 0{i + 1}
                </div>
                <h3 className="mt-2 font-display text-3xl tracking-wide">{t.name}</h3>
                <p className="mt-1 text-sm text-void-700">{t.blurb}</p>

                {/* Price stack — strikethrough original, live price, save chip */}
                <div className="mt-8">
                  {wasPrice && t.discountPercent > 0 && (
                    <div className="flex items-baseline gap-2 font-mono text-[12px] text-void-700">
                      <span className="line-through decoration-signal-red/70 decoration-[2px]">
                        {wasPrice}
                      </span>
                      <span className="chip border-signal-red/40 bg-signal-red/[0.08] text-signal-red">
                        −{t.discountPercent}%
                      </span>
                    </div>
                  )}
                  <div className="mt-1 flex items-baseline gap-1">
                    <span
                      className={`font-display text-6xl tracking-wide ${
                        t.highlight ? "text-signal-green" : "text-void-900"
                      }`}
                    >
                      {p.amount}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-widest2 text-void-700">
                      {p.sub}
                    </span>
                  </div>
                  {wasPrice && t.discountPercent > 0 && (
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-signal-amber">
                      Founders pricing · ends at public launch
                    </div>
                  )}
                </div>

                <ul className="mt-8 space-y-3 text-sm">
                  {t.features.map((f, k) => (
                    <li key={k} className="flex items-start gap-2 text-void-800">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal-green" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/dashboard/billing"
                  className={`mt-10 w-full ${
                    t.highlight ? "btn-primary" : "btn-ghost"
                  } block text-center`}
                >
                  {t.cta}
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-widest2 text-void-700">
          <span>
            {currency === "USD"
              ? "Stripe · Visa · Mastercard · Amex · 3DS · cancel anytime"
              : "PayMongo · GCash · Maya · GrabPay · cards · 14-day refund"}
          </span>
          <span className="text-void-700">
            taxes calculated at checkout
          </span>
        </div>
      </div>
    </section>
  );
}

function CurrencyButton({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-0.5 px-4 py-2 text-left transition ${
        active
          ? "bg-signal-green text-void-0"
          : "bg-transparent text-void-800 hover:bg-void-100"
      }`}
    >
      <span className="font-display text-lg leading-none tracking-wide">{label}</span>
      <span
        className={`font-mono text-[9px] uppercase tracking-widest2 ${
          active ? "text-void-0/80" : "text-void-700"
        }`}
      >
        {sub}
      </span>
    </button>
  );
}
