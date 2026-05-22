import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import { Sparkline } from "@/components/dash/Sparkline";

const RDIST = [
  { r: "−3R+", v: 4 },
  { r: "−2R", v: 7 },
  { r: "−1R", v: 18 },
  { r: "0R", v: 11 },
  { r: "+1R", v: 27 },
  { r: "+2R", v: 19 },
  { r: "+3R", v: 9 },
  { r: "+4R+", v: 5 },
];
const max = Math.max(...RDIST.map((d) => d.v));

const SESSIONS = [
  { s: "Asia", w: 41, n: 18 },
  { s: "London", w: 68, n: 47 },
  { s: "NY", w: 59, n: 42 },
  { s: "Overlap", w: 71, n: 20 },
];

export default function AnalyticsPage() {
  return (
    <>
      <Topbar title="Analytics" sub="performance telemetry · 90D rolling window" />

      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { k: "Trades", v: "127" },
            { k: "Win rate", v: "62.1%", c: "text-signal-green" },
            { k: "Expectancy", v: "+0.42R", c: "text-signal-green" },
            { k: "Max DD", v: "−6.4R", c: "text-signal-red" },
          ].map((s) => (
            <div key={s.k} className="cell brackets relative p-4">
              <span className="b1" />
              <span className="b2" />
              <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                {s.k}
              </div>
              <div className={`mt-2 font-display text-3xl tracking-wide ${s.c ?? ""}`}>{s.v}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel title="R-multiple distribution" meta="last 100 trades" className="xl:col-span-2">
            <div className="flex h-56 items-end gap-2">
              {RDIST.map((d) => {
                const negative = d.r.startsWith("−");
                return (
                  <div key={d.r} className="flex flex-1 flex-col items-center gap-2">
                    <div className="font-mono text-[10px] text-void-600">{d.v}</div>
                    <div
                      className={`w-full ${negative ? "bg-signal-red/60" : "bg-signal-green/70"}`}
                      style={{ height: `${(d.v / max) * 100}%` }}
                    />
                    <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                      {d.r}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Equity · 90D" meta="USDT">
            <div className="h-44">
              <Sparkline
                data={[
                  100, 102, 99, 105, 108, 106, 112, 115, 118, 116, 122, 124, 121, 128, 131, 134,
                  130, 138, 141, 144, 147, 151, 148, 156, 160, 159, 163, 168, 172, 176,
                ]}
                tone="green"
                height={176}
              />
            </div>
          </Panel>
        </div>

        <Panel title="Session edge" meta="win rate by session">
          <div className="grid grid-cols-1 gap-px bg-void-300/60 sm:grid-cols-4">
            {SESSIONS.map((s) => (
              <div key={s.s} className="bg-void-50/60 p-5">
                <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                  {s.s} · {s.n} trades
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span
                    className={`font-display text-4xl tracking-wide ${
                      s.w >= 60 ? "text-signal-green" : s.w >= 50 ? "text-signal-amber" : "text-signal-red"
                    }`}
                  >
                    {s.w}%
                  </span>
                  <span className="font-mono text-[10px] text-void-700">win</span>
                </div>
                <div className="mt-3 h-1 w-full bg-void-300/60">
                  <div
                    className={`${
                      s.w >= 60 ? "bg-signal-green" : s.w >= 50 ? "bg-signal-amber" : "bg-signal-red"
                    } h-full`}
                    style={{ width: `${s.w}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
