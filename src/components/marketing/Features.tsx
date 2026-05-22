"use client";

import {
  Activity,
  Brain,
  Crosshair,
  Flame,
  GitBranch,
  Microscope,
  PenLine,
  Radio,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FEATURES: { icon: LucideIcon; title: string; body: string; tag: string }[] = [
  {
    icon: Microscope,
    title: "AI Trade Autopsy",
    body: "Vision model reads your chart, decodes structure, and writes the post-mortem you'd pay a coach for.",
    tag: "Core",
  },
  {
    icon: Crosshair,
    title: "Smart-Money Detection",
    body: "Liquidity pools, inducement, SMT divergence, traps. The map of where institutions actually went.",
    tag: "ICT/SMC",
  },
  {
    icon: Brain,
    title: "Psychology Engine",
    body: "Revenge entries, FOMO chases, fear exits. We score every trade against your behavioural baseline.",
    tag: "Mind",
  },
  {
    icon: Flame,
    title: "Revenge-Trade Guard",
    body: "Detects tilt patterns and locks down position size automatically until you cool off.",
    tag: "Guard",
  },
  {
    icon: PenLine,
    title: "Auto Journal",
    body: "Every upload becomes a tagged journal entry — searchable, filterable, replayable.",
    tag: "Journal",
  },
  {
    icon: Activity,
    title: "Performance Telemetry",
    body: "Win rate, expectancy, R-multiple distribution, drawdown bands. The metrics desks live by.",
    tag: "Stats",
  },
  {
    icon: GitBranch,
    title: "Trade Replay",
    body: "Step the chart forward bar-by-bar with the AI narrating the structural evolution.",
    tag: "Replay",
  },
  {
    icon: Radio,
    title: "Exchange Automation",
    body: "Connect BingX / Binance / Bybit / OKX. Paper-trade, semi-auto, or full-auto with risk caps.",
    tag: "Auto",
  },
  {
    icon: ShieldAlert,
    title: "Prop Firm Mode",
    body: "Daily loss limits, news lockouts, position rules. Stay inside challenge constraints automatically.",
    tag: "Prop",
  },
];

export function Features() {
  return (
    <section id="features" className="relative border-b border-void-300/60 py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest3 text-signal-cyan">
          <span className="grid h-5 w-5 place-items-center border border-signal-cyan/60">03</span>
          <span>Capabilities</span>
          <span className="h-px flex-1 bg-void-300/70" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <h2 className="display-crush text-5xl sm:text-6xl lg:col-span-7">
            Nine systems.<br /> One verdict per trade.
          </h2>
          <p className="text-void-700 lg:col-span-5 lg:pt-4">
            Built like a quant desk: each module has a single job, runs in parallel, and feeds
            a unified report. No fluff, no horoscopes, no &ldquo;trust the process.&rdquo;
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-px bg-void-300/60 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FeatureCard key={i} {...f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  tag,
  index,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  tag: string;
  index: number;
}) {
  return (
    <div className="group relative overflow-hidden bg-void-50/60 p-6 transition hover:bg-void-100">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-cyan/0 to-transparent transition group-hover:via-signal-cyan/60" />
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2 text-void-700">
        <span>0{index + 1} / 09</span>
        <span className="border border-void-300 px-1.5 py-0.5">{tag}</span>
      </div>
      <Icon className="mt-6 h-7 w-7 text-signal-cyan transition group-hover:text-signal-green" />
      <h3 className="mt-4 font-display text-2xl tracking-wide">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-void-700">{body}</p>
    </div>
  );
}
