import type { Metadata } from "next";
import { PageShell } from "../_PageShell";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "What's next for Voidexx — concrete, dated, and honest about deferrals.",
};

const ITEMS = [
  {
    when: "Phase 7.5",
    title: "Discord OAuth + push notifications",
    detail:
      "Bridge autopsy events to a user's Discord webhook; web push for live trap alerts. Deferred from Phase 7 to keep the growth foundation reviewable.",
    eta: "Q3 2026",
  },
  {
    when: "Phase 8",
    title: "Backtest replay surface",
    detail:
      "Drop a TradingView chart export → step through the bar-by-bar replay with the autopsy verdict overlaid. The first non-screenshot ingest mode.",
    eta: "Q3 2026",
  },
  {
    when: "Phase 9",
    title: "Multi-venue trade execution",
    detail:
      "Beyond BingX: Binance · Bybit · OKX · MT5 adapters. Same risk engine, registry-pattern dispatcher already in place.",
    eta: "Q4 2026",
  },
  {
    when: "Phase 10",
    title: "Team Desk seats",
    detail:
      "Real five-seat shared dashboard for Desk plan customers — prop firms and trading rooms. Audit log surfaces who placed what.",
    eta: "Q4 2026",
  },
  {
    when: "Phase 11",
    title: "Sentiment + macro overlay",
    detail:
      "FOMC / CPI / NFP timing on autopsy charts. The model already cites session structure; this lets it cite the macro why.",
    eta: "Q1 2027",
  },
];

export default function RoadmapPage() {
  return (
    <PageShell
      eyebrow="Resources · Roadmap"
      title="What&rsquo;s next."
      italic="Honest about deferrals."
    >
      <p>
        We don&apos;t pre-announce — most items here are already in design.
        Dates are best-effort and slip when we hit something interesting
        worth doing properly.
      </p>

      <ul className="!space-y-8">
        {ITEMS.map((i) => (
          <li
            key={i.when}
            className="!pl-6 !before:content-none border-l-2 border-signal-violet/50"
          >
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-[11px] uppercase tracking-widest2 text-signal-violet">
                {i.when}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                eta · {i.eta}
              </span>
            </div>
            <h2 className="!mt-1">{i.title}</h2>
            <p className="!mt-2 text-[14px]">{i.detail}</p>
          </li>
        ))}
      </ul>

      <p className="mt-8">
        Got a request that&apos;s not here? Email{" "}
        <a href="mailto:ops@voidexx.io">ops@voidexx.io</a> with the trade
        scenario you&apos;re trying to solve. We read everything; we
        prioritise by repeated-from-multiple-users.
      </p>
    </PageShell>
  );
}
