import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import { Bot, Power, Shield, Zap } from "lucide-react";

const VENUES = [
  { name: "BingX", status: "connected", mode: "paper", balance: "$8,420.18", last: "22 May 11:02" },
  { name: "Binance", status: "available", mode: "—", balance: "—", last: "—" },
  { name: "Bybit", status: "available", mode: "—", balance: "—", last: "—" },
  { name: "OKX", status: "available", mode: "—", balance: "—", last: "—" },
];

const STRATS = [
  {
    name: "London OB sniper",
    status: "armed",
    venue: "BingX",
    rr: "1:3.2",
    win: 64,
  },
  {
    name: "NY overlap reversal",
    status: "running",
    venue: "BingX",
    rr: "1:2.4",
    win: 58,
  },
  {
    name: "Asia raid hunter",
    status: "paused",
    venue: "—",
    rr: "1:1.8",
    win: 47,
  },
];

const POSITIONS = [
  { sym: "BTC / USDT", side: "LONG", size: "0.014", entry: "67,290.0", pnl: "+0.7R", c: "green" },
  { sym: "ETH / USDT", side: "SHORT", size: "0.41", entry: "3,251.4", pnl: "−0.3R", c: "red" },
];

export default function AutomationPage() {
  return (
    <>
      <Topbar title="Automation hub" sub="strategy desk · risk caps engaged · paper mode" />

      <div className="flex-1 space-y-6 p-4 sm:p-6">
        {/* Risk caps */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { k: "Daily loss cap", v: "−2.0R", icon: Shield, c: "text-signal-red" },
            { k: "Max concurrent", v: "3 pos", icon: Zap, c: "text-signal-cyan" },
            { k: "Per-trade size", v: "0.5%", icon: Power, c: "text-signal-amber" },
            { k: "AI override", v: "ON", icon: Bot, c: "text-signal-green" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.k} className="cell brackets relative p-4">
                <span className="b1" />
                <span className="b2" />
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                  <span>{s.k}</span>
                  <Icon className={`h-3.5 w-3.5 ${s.c}`} />
                </div>
                <div className={`mt-3 font-display text-3xl tracking-wide ${s.c}`}>{s.v}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel title="Connected venues" meta="encrypted · server-only" className="xl:col-span-2">
            <div className="divide-y divide-void-300/60">
              {VENUES.map((v) => (
                <div key={v.name} className="grid grid-cols-12 items-center gap-3 py-3">
                  <span className="col-span-3 font-display text-xl tracking-wide">{v.name}</span>
                  <span
                    className={`col-span-2 font-mono text-[11px] uppercase tracking-widest2 ${
                      v.status === "connected" ? "text-signal-green" : "text-void-700"
                    }`}
                  >
                    ● {v.status}
                  </span>
                  <span className="col-span-2 font-mono text-[11px] text-void-700">{v.mode}</span>
                  <span className="col-span-2 font-mono text-[11px] text-void-900">{v.balance}</span>
                  <span className="col-span-2 font-mono text-[10px] text-void-700">{v.last}</span>
                  <button
                    className={`col-span-1 border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 ${
                      v.status === "connected"
                        ? "border-signal-red/60 text-signal-red"
                        : "border-signal-cyan/60 text-signal-cyan"
                    }`}
                  >
                    {v.status === "connected" ? "Disc." : "Link"}
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Open positions" meta="real-time">
            <ul className="space-y-3 font-mono text-[12px]">
              {POSITIONS.map((p, i) => (
                <li key={i} className="border-l-2 border-void-300 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg tracking-wide">{p.sym}</span>
                    <span
                      className={`text-[10px] uppercase tracking-widest2 ${
                        p.side === "LONG" ? "text-signal-green" : "text-signal-red"
                      }`}
                    >
                      {p.side}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-void-700">
                      {p.size} @ {p.entry}
                    </span>
                    <span
                      className={
                        p.c === "green" ? "text-signal-green" : "text-signal-red"
                      }
                    >
                      {p.pnl}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel title="Strategy templates">
          <div className="grid grid-cols-1 gap-px bg-void-300/60 sm:grid-cols-3">
            {STRATS.map((s) => (
              <div key={s.name} className="bg-void-50/60 p-5">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2">
                  <span
                    className={
                      s.status === "running"
                        ? "text-signal-green"
                        : s.status === "armed"
                          ? "text-signal-cyan"
                          : "text-void-700"
                    }
                  >
                    ● {s.status}
                  </span>
                  <span className="text-void-700">{s.venue}</span>
                </div>
                <div className="mt-2 font-display text-2xl tracking-wide">{s.name}</div>
                <div className="mt-3 grid grid-cols-2 gap-px bg-void-300/60">
                  <div className="bg-void-100/60 p-2 text-center font-mono text-[11px]">
                    <div className="text-[9px] uppercase tracking-widest2 text-void-700">R:R</div>
                    <div className="text-void-900">{s.rr}</div>
                  </div>
                  <div className="bg-void-100/60 p-2 text-center font-mono text-[11px]">
                    <div className="text-[9px] uppercase tracking-widest2 text-void-700">Win</div>
                    <div className="text-signal-green">{s.win}%</div>
                  </div>
                </div>
                <button className="btn-ghost mt-4 w-full justify-center">Configure →</button>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
