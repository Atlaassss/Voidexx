"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

type Currency = "USD" | "PHP";

interface Tier {
  name: string;
  prices: Record<Currency, { amount: string; sub: string }>;
  blurb: string;
  features: string[];
  cta: string;
  highlight: boolean;
}

// Prices mirrored from src/lib/billing/plans.ts — kept in sync manually
// because this is a server-rendered marketing page and we don't want to
// pull the env-coupled PLANS dict into the marketing bundle. The
// flat-rate USD→PHP conversion is the same (×56) used in plans.ts.
const TIERS: Tier[] = [
  {
    name: "Recon",
    prices: {
      USD: { amount: "$0", sub: "/forever" },
      PHP: { amount: "₱0", sub: "/forever" },
    },
    blurb: "Run autopsies. Get a feel.",
    features: [
      "5 trade autopsies / month",
      "Basic structural read",
      "Auto journal (limited)",
      "Ads enabled",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Operator",
    prices: {
      USD: { amount: "$24", sub: "/month" },
      PHP: { amount: "₱1,344", sub: "/month" },
    },
    blurb: "For active retail traders.",
    features: [
      "Unlimited autopsies",
      "Full smart-money decoder",
      "Psychology + tilt guard",
      "Exchange automation (1 venue)",
      "Priority queue · zero ads",
    ],
    cta: "Go Operator",
    highlight: true,
  },
  {
    name: "Desk",
    prices: {
      USD: { amount: "$79", sub: "/month" },
      PHP: { amount: "₱4,424", sub: "/month" },
    },
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
          <h2 className="display-crush max-w-3xl text-5xl sm:text-7xl">
            Three tiers.
            <br />
            <span className="editorial text-signal-amber">No fake urgency.</span>
          </h2>

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

                <div className="mt-8 flex items-baseline gap-1">
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
