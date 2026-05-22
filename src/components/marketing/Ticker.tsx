"use client";

const SYMBOLS = [
  { s: "BTCUSDT", p: 67_421.2, c: +1.42 },
  { s: "ETHUSDT", p: 3_241.55, c: -0.81 },
  { s: "SOLUSDT", p: 162.07, c: +3.91 },
  { s: "EURUSD", p: 1.0834, c: -0.12 },
  { s: "GBPJPY", p: 197.24, c: +0.34 },
  { s: "XAUUSD", p: 2_348.91, c: +0.92 },
  { s: "NAS100", p: 18_402.4, c: -0.41 },
  { s: "BNBUSDT", p: 612.18, c: +0.62 },
  { s: "ADAUSDT", p: 0.4421, c: -2.11 },
  { s: "USOIL", p: 78.62, c: +1.04 },
];

function fmt(p: number) {
  if (p < 10) return p.toFixed(4);
  if (p < 1000) return p.toFixed(2);
  return p.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function Ticker() {
  const items = [...SYMBOLS, ...SYMBOLS];
  return (
    <div className="overflow-hidden border-y border-void-300/60 bg-void-50/80">
      <div className="flex animate-ticker whitespace-nowrap py-2 [animation-duration:80s] hover:[animation-play-state:paused]">
        {items.map((it, i) => (
          <div
            key={i}
            className="mx-6 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-void-800"
          >
            <span className="text-void-700">{it.s}</span>
            <span className="text-void-900">{fmt(it.p)}</span>
            <span className={it.c >= 0 ? "text-signal-green" : "text-signal-red"}>
              {it.c >= 0 ? "+" : ""}
              {it.c.toFixed(2)}%
            </span>
            <span className="text-void-500">|</span>
          </div>
        ))}
      </div>
    </div>
  );
}
