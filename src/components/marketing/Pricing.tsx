"use client";

import Link from "next/link";
import { Check } from "lucide-react";

const TIERS = [
  {
    name: "Recon",
    price: "$0",
    sub: "/forever",
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
    price: "$24",
    sub: "/month",
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
    price: "$79",
    sub: "/month",
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
  return (
    <section id="pricing" className="relative border-b border-void-300/60 py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest3 text-signal-cyan">
          <span className="grid h-5 w-5 place-items-center border border-signal-cyan/60">05</span>
          <span>Pricing</span>
          <span className="h-px flex-1 bg-void-300/70" />
        </div>

        <h2 className="display-crush mt-4 max-w-3xl text-5xl sm:text-7xl">
          Three tiers.<br />
          <span className="editorial text-signal-amber">No fake urgency.</span>
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-px bg-void-300/70 lg:grid-cols-3">
          {TIERS.map((t, i) => (
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
                <span className={`font-display text-6xl tracking-wide ${t.highlight ? "text-signal-green" : "text-void-900"}`}>
                  {t.price}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-widest2 text-void-700">
                  {t.sub}
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
                href="/dashboard"
                className={`mt-10 w-full ${t.highlight ? "btn-primary" : "btn-ghost"} block text-center`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-widest2 text-void-700">
          Stripe · PayPal · GCash · Maya · cancel anytime · 14-day refund window
        </p>
      </div>
    </section>
  );
}
