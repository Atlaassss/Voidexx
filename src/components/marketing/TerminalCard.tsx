"use client";

import { useEffect, useState } from "react";

const LINES = [
  { t: 200, l: "$ voidexx ingest --src tradingview.png" },
  { t: 700, l: "[ OK ] OCR pass complete · 14 candles · 1H · BTCUSDT" },
  { t: 1000, l: "[ OK ] Structure: BOS @ 67,420 | CHoCH @ 67,580" },
  { t: 1300, l: "[ ! ] Liquidity grab detected above ASIA HIGH (67,612)" },
  { t: 1700, l: "[ OK ] Order block: 67,290 - 67,355 (4H bullish)" },
  { t: 2000, l: "[ ! ] FVG ignored on entry · premium of dealing range" },
  { t: 2400, l: "[ DX ] Psychology flag: REVENGE_ENTRY (conf 0.81)" },
  { t: 2800, l: "[ OK ] Smart-money read: stop hunt → reversal" },
  { t: 3200, l: "[ DX ] Risk: 4.2R lost · should have been 0.5R max" },
  { t: 3700, l: "» Generating autopsy report ..." },
];

export function TerminalCard() {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const timers = LINES.map((row, i) =>
      setTimeout(() => setShown((s) => Math.max(s, i + 1)), row.t),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="brackets cell scanlines noise overflow-hidden">
      <span className="b1" />
      <span className="b2" />

      {/* Header */}
      <div className="cell-header">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-signal-red/80" />
          <span className="h-2 w-2 rounded-full bg-signal-amber/80" />
          <span className="h-2 w-2 rounded-full bg-signal-green/80" />
          <span className="ml-3 text-void-800">voidexx://autopsy/btc-1h-2026-05-22</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal-green" />
          <span>LIVE</span>
        </div>
      </div>

      {/* Sub-header tabs */}
      <div className="flex items-center gap-0 border-b border-void-300/80 bg-void-50/80 font-mono text-[10px] uppercase tracking-widest2">
        <Tab active>Console</Tab>
        <Tab>Chart</Tab>
        <Tab>Report</Tab>
        <div className="ml-auto px-3 py-2 text-void-600">
          <span className="text-signal-cyan">CPU</span> 71% · <span className="text-signal-green">GPU</span> 22%
        </div>
      </div>

      {/* Body — split */}
      <div className="grid grid-cols-1 sm:grid-cols-5">
        {/* Console output */}
        <div className="relative h-[360px] overflow-hidden bg-void-0/80 sm:col-span-3">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-cyan/40 to-transparent" />
          <div className="absolute inset-0 animate-scan bg-gradient-to-b from-transparent via-signal-cyan/[0.04] to-transparent" />
          <div className="relative h-full overflow-hidden p-4 font-mono text-[11px] leading-6 text-void-800">
            {LINES.slice(0, shown).map((row, i) => (
              <div key={i} className="animate-rise">
                <Pretty l={row.l} />
              </div>
            ))}
            {shown < LINES.length && <span className="caret text-signal-green" />}
            {shown === LINES.length && (
              <div className="mt-3 border border-signal-green/40 bg-signal-green/[0.06] p-3 text-signal-green animate-rise">
                <div className="font-display text-base tracking-wide">VERDICT // 38 / 100</div>
                <div className="mt-1 text-void-800">
                  Liquidity-trap entry above session high. Re-enter on retrace into 4H OB after
                  confirmation. Reduce size 4× until discipline score &gt; 70.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side meta */}
        <aside className="border-t border-void-300/80 bg-void-50/60 p-4 font-mono text-[11px] sm:col-span-2 sm:border-l sm:border-t-0">
          <div className="text-[10px] uppercase tracking-widest2 text-void-700">Trade meta</div>
          <dl className="mt-3 space-y-2 text-void-800">
            <Row k="Symbol" v="BTC / USDT" />
            <Row k="Direction" v={<span className="text-signal-red">SHORT</span>} />
            <Row k="Entry" v="67,612.4" />
            <Row k="Stop" v="67,790.1" />
            <Row k="Target" v="66,840.0" />
            <Row k="R:R planned" v="1 : 4.3" />
            <Row k="Outcome" v={<span className="text-signal-red">−4.2R</span>} />
          </dl>

          <div className="mt-5 text-[10px] uppercase tracking-widest2 text-void-700">Flags</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Flag tone="red">Revenge</Flag>
            <Flag tone="amber">Liquidity grab</Flag>
            <Flag tone="amber">Premium entry</Flag>
            <Flag tone="violet">Trap fill</Flag>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Tab({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={`border-r border-void-300/80 px-4 py-2 transition ${
        active
          ? "bg-void-200 text-void-900"
          : "text-void-700 hover:text-signal-cyan"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-void-300/60 pb-1.5">
      <dt className="text-void-700">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Flag({ children, tone }: { children: React.ReactNode; tone: "red" | "amber" | "violet" | "green" }) {
  const map = {
    red: "border-signal-red/40 text-signal-red bg-signal-red/[0.08]",
    amber: "border-signal-amber/40 text-signal-amber bg-signal-amber/[0.08]",
    violet: "border-signal-violet/40 text-signal-violet bg-signal-violet/[0.08]",
    green: "border-signal-green/40 text-signal-green bg-signal-green/[0.08]",
  };
  return (
    <span className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] uppercase tracking-widest2 ${map[tone]}`}>
      {children}
    </span>
  );
}

function Pretty({ l }: { l: string }) {
  // Color tags like [ OK ], [ ! ], [ DX ]
  const okMatch = l.match(/^\[ (OK|!|DX) \]/);
  if (okMatch) {
    const tag = okMatch[1];
    const rest = l.slice(okMatch[0].length);
    const color =
      tag === "OK"
        ? "text-signal-green"
        : tag === "!"
          ? "text-signal-amber"
          : "text-signal-violet";
    return (
      <div>
        <span className={color}>[ {tag.padEnd(2, " ")} ]</span>
        <span className="text-void-800">{rest}</span>
      </div>
    );
  }
  if (l.startsWith("$")) return <div className="text-signal-cyan">{l}</div>;
  if (l.startsWith("»")) return <div className="text-signal-cyan">{l}</div>;
  return <div className="text-void-800">{l}</div>;
}
