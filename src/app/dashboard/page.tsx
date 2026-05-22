import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import { Sparkline } from "@/components/dash/Sparkline";
import {
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  Crosshair,
  Flame,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

const PNL = [12, 14, 11, 16, 20, 18, 21, 24, 22, 28, 26, 31, 33, 30, 36, 41, 38, 44, 47, 50];
const DISC = [54, 56, 60, 58, 62, 65, 63, 70, 72, 68, 74, 78, 75, 80, 78, 82, 84, 81, 85, 88];
const RISK = [62, 60, 58, 60, 55, 50, 52, 48, 45, 47, 42, 40, 38, 41, 36, 34, 32, 30, 28, 27];

export default function CommandCenter() {
  return (
    <>
      <Topbar
        title="Command center"
        sub="Operator · BingX desk · 22 May 2026 · risk caps engaged"
      />

      <div className="flex-1 space-y-6 p-4 sm:p-6">
        {/* Top KPI strip */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi
            label="Net P&L · 30D"
            value="+$12,480"
            delta="+18.4%"
            tone="green"
            data={PNL}
            icon={ArrowUpRight}
          />
          <Kpi
            label="Discipline score"
            value="88 / 100"
            delta="+12 wk"
            tone="cyan"
            data={DISC}
            icon={ShieldCheck}
          />
          <Kpi
            label="Risk index"
            value="27"
            delta="−9 wk"
            tone="amber"
            data={RISK}
            icon={Crosshair}
            invert
          />
          <Kpi
            label="Tilt detector"
            value="Calm"
            delta="0 events"
            tone="green"
            data={[3, 2, 1, 0, 1, 0, 0, 1, 0, 0]}
            icon={Brain}
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel title="Equity curve · 90D" meta="USDT · log scale" className="xl:col-span-2">
            <EquityChart />
            <div className="mt-4 grid grid-cols-3 gap-px bg-void-300/70 font-mono text-[11px]">
              {[
                { k: "Trades", v: "127" },
                { k: "Win rate", v: "62.1%" },
                { k: "Avg R", v: "+0.84" },
                { k: "Best", v: "+5.2R" },
                { k: "Worst", v: "−2.1R" },
                { k: "Expectancy", v: "0.42" },
              ].map((s) => (
                <div key={s.k} className="bg-void-50/60 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest2 text-void-700">{s.k}</div>
                  <div className="text-void-900">{s.v}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="AI directives" meta="auto · live">
            <ul className="space-y-3 text-sm">
              <Directive
                tone="green"
                title="Continue London-session shorts"
                body="Setup A is at 71% hit rate over last 30 instances. Hold size."
              />
              <Directive
                tone="amber"
                title="Reduce risk pre-FOMC"
                body="Volatility expansion expected 13:30 UTC. Cut size 50%."
              />
              <Directive
                tone="red"
                title="Block USDJPY for 48h"
                body="3 consecutive losses, all chasing reversal. Pattern flag: revenge."
              />
              <Directive
                tone="violet"
                title="Lesson queued: Asia-session liquidity"
                body="Your last 5 losses all sat above ASIA HIGH. Recommended unit: 14m."
              />
            </ul>
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel title="Smart-money trap tracker" meta="last 14 days">
            <ul className="space-y-2 font-mono text-[12px]">
              <Trap sym="BTC" tf="1H" type="Asia high sweep" hit />
              <Trap sym="ETH" tf="15M" type="Equal lows raid" />
              <Trap sym="XAU" tf="4H" type="Inducement low" hit />
              <Trap sym="EUR" tf="1H" type="London open trap" />
              <Trap sym="SOL" tf="5M" type="Stop hunt → reversal" hit />
            </ul>
          </Panel>

          <Panel title="Recent autopsies" meta="3 / 5 free" className="xl:col-span-2">
            <div className="divide-y divide-void-300/60">
              {RECENT.map((r, i) => (
                <Link
                  key={i}
                  href="/dashboard/upload"
                  className="grid grid-cols-12 items-center gap-3 py-3 transition hover:bg-void-100/40"
                >
                  <span className="col-span-2 font-mono text-[11px] text-void-700">{r.t}</span>
                  <span className="col-span-3 font-display text-base tracking-wide">{r.sym}</span>
                  <span className="col-span-3 text-sm text-void-800">{r.note}</span>
                  <span
                    className={`col-span-2 text-right font-mono text-[12px] ${
                      r.r > 0 ? "text-signal-green" : "text-signal-red"
                    }`}
                  >
                    {r.r > 0 ? "+" : ""}
                    {r.r.toFixed(1)}R
                  </span>
                  <span
                    className={`col-span-2 text-right font-display text-2xl ${
                      r.score >= 75
                        ? "text-signal-green"
                        : r.score >= 50
                          ? "text-signal-amber"
                          : "text-signal-red"
                    }`}
                  >
                    {r.score}
                  </span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

const RECENT = [
  { t: "10:42 UTC", sym: "BTC / USDT · 1H", note: "Liquidity grab above session high", r: -4.2, score: 38 },
  { t: "08:15 UTC", sym: "EUR / USD · 15M", note: "Clean OB retest, textbook entry", r: +2.6, score: 91 },
  { t: "07:01 UTC", sym: "XAU / USD · 4H", note: "Late entry, 0.4R lost on stop", r: -0.4, score: 58 },
  { t: "yest. 21:33", sym: "SOL / USDT · 5M", note: "Stop hunt, reversed for 3R", r: +3.1, score: 87 },
  { t: "yest. 14:09", sym: "GBP / JPY · 1H", note: "FVG ignored, premium short", r: -1.8, score: 44 },
];

function Kpi({
  label,
  value,
  delta,
  tone,
  data,
  icon: Icon,
  invert = false,
}: {
  label: string;
  value: string;
  delta: string;
  tone: "green" | "red" | "cyan" | "violet" | "amber";
  data: number[];
  icon: React.ComponentType<{ className?: string }>;
  invert?: boolean;
}) {
  const positive = !invert ? !delta.startsWith("−") : delta.startsWith("−");
  const toneClass = {
    green: "text-signal-green",
    red: "text-signal-red",
    cyan: "text-signal-cyan",
    violet: "text-signal-violet",
    amber: "text-signal-amber",
  }[tone];
  return (
    <div className="cell brackets relative p-4">
      <span className="b1" />
      <span className="b2" />
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2 text-void-700">
        <span>{label}</span>
        <Icon className={`h-3.5 w-3.5 ${toneClass}`} />
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="font-display text-3xl tracking-wide">{value}</div>
          <div
            className={`mt-1 flex items-center gap-1 font-mono text-[11px] ${
              positive ? "text-signal-green" : "text-signal-red"
            }`}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {delta}
          </div>
        </div>
        <div className="h-12 w-24">
          <Sparkline data={data} tone={tone} height={48} />
        </div>
      </div>
    </div>
  );
}

function EquityChart() {
  const data = [
    100, 102, 99, 105, 108, 106, 112, 115, 118, 116, 122, 124, 121, 128, 131, 134, 130, 138, 141,
    144, 147, 151, 148, 156, 160, 159, 163, 168, 172, 176,
  ];
  const w = 800;
  const h = 220;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 16) - 8;
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fill = `${path} L${w},${h} L0,${h} Z`;
  return (
    <div className="relative h-[220px]">
      <div className="absolute inset-0 bg-grid-fine opacity-50" />
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="relative h-full w-full">
        <defs>
          <linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(0,255,157)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(0,255,157)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill="url(#eqg)" />
        <path d={path} stroke="rgb(0,255,157)" strokeWidth="1.6" fill="none" />
      </svg>
      <div className="pointer-events-none absolute inset-x-2 bottom-1 flex justify-between font-mono text-[9px] uppercase tracking-widest2 text-void-600">
        <span>Mar</span>
        <span>Apr</span>
        <span>May</span>
      </div>
    </div>
  );
}

function Directive({
  tone,
  title,
  body,
}: {
  tone: "green" | "amber" | "red" | "violet";
  title: string;
  body: string;
}) {
  const map = {
    green: { border: "border-signal-green/60", text: "text-signal-green" },
    amber: { border: "border-signal-amber/60", text: "text-signal-amber" },
    red: { border: "border-signal-red/60", text: "text-signal-red" },
    violet: { border: "border-signal-violet/60", text: "text-signal-violet" },
  }[tone];
  return (
    <li className={`border-l-2 pl-3 ${map.border}`}>
      <div className={`font-mono text-[10px] uppercase tracking-widest2 ${map.text}`}>
        {tone.toUpperCase()}
      </div>
      <div className="mt-0.5 font-display text-base tracking-wide">{title}</div>
      <div className="text-sm text-void-700">{body}</div>
    </li>
  );
}

function Trap({ sym, tf, type, hit }: { sym: string; tf: string; type: string; hit?: boolean }) {
  return (
    <li className="flex items-center gap-3 border-l-2 border-void-300 pl-3">
      <span className="text-void-700">{sym}</span>
      <span className="text-void-600">{tf}</span>
      <span className="ml-2 text-void-900">{type}</span>
      <span
        className={`ml-auto inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] uppercase tracking-widest2 ${
          hit
            ? "border-signal-green/40 bg-signal-green/[0.08] text-signal-green"
            : "border-void-300 text-void-700"
        }`}
      >
        {hit ? <Flame className="h-3 w-3" /> : null}
        {hit ? "hit" : "watching"}
      </span>
    </li>
  );
}
