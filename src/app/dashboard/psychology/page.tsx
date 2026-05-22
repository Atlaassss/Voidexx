import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";

const TRAITS = [
  { k: "Discipline", v: 88, t: "green" as const },
  { k: "Patience", v: 76, t: "cyan" as const },
  { k: "Conviction", v: 71, t: "violet" as const },
  { k: "Risk awareness", v: 64, t: "amber" as const },
  { k: "Tilt resistance", v: 52, t: "red" as const },
];

const colorMap = {
  green: "bg-signal-green text-signal-green",
  cyan: "bg-signal-cyan text-signal-cyan",
  violet: "bg-signal-violet text-signal-violet",
  amber: "bg-signal-amber text-signal-amber",
  red: "bg-signal-red text-signal-red",
};

const FLAGS = [
  { tag: "Revenge", count: 4, last: "21 May · 14:09", tone: "red" },
  { tag: "FOMO", count: 7, last: "20 May · 09:21", tone: "amber" },
  { tag: "Fear exit", count: 12, last: "19 May · 22:45", tone: "amber" },
  { tag: "Overconfidence", count: 2, last: "16 May · 11:02", tone: "violet" },
];

export default function PsychologyPage() {
  return (
    <>
      <Topbar title="Psychology" sub="behavioural baseline · trader personality profile" />

      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel title="Trader profile" className="xl:col-span-2">
            <div className="grid grid-cols-1 gap-px bg-void-300/60 sm:grid-cols-2">
              <div className="bg-void-50/60 p-6">
                <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                  Archetype
                </div>
                <div className="mt-2 font-display text-4xl tracking-wide text-signal-cyan">
                  Patient sniper
                </div>
                <p className="mt-2 text-sm text-void-700">
                  Above-average patience, sub-par tilt resistance. Strongest in London-NY overlap;
                  vulnerable on Mondays after a losing Friday.
                </p>
              </div>
              <div className="bg-void-50/60 p-6">
                <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                  Composite
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-7xl leading-none text-signal-green">71</span>
                  <span className="font-mono text-[10px] text-void-700">/ 100</span>
                </div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-widest2 text-signal-green">
                  +12 vs. last 30D
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {TRAITS.map((t) => {
                const [bar, txt] = colorMap[t.t].split(" ");
                return (
                  <div key={t.k}>
                    <div className="mb-1 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest2">
                      <span className="text-void-800">{t.k}</span>
                      <span className={txt}>{t.v}</span>
                    </div>
                    <div className="h-1.5 w-full bg-void-300/60">
                      <div className={`${bar} h-full`} style={{ width: `${t.v}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Behavioural flags" meta="last 30D">
            <ul className="space-y-3 font-mono text-[12px]">
              {FLAGS.map((f) => (
                <li
                  key={f.tag}
                  className="flex items-center justify-between border-l-2 border-void-300 pl-3"
                >
                  <div>
                    <div className="font-display text-base tracking-wide text-void-900">
                      {f.tag}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest2 text-void-700">
                      last · {f.last}
                    </div>
                  </div>
                  <span
                    className={`font-display text-3xl ${
                      f.tone === "red"
                        ? "text-signal-red"
                        : f.tone === "amber"
                          ? "text-signal-amber"
                          : "text-signal-violet"
                    }`}
                  >
                    {f.count}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel title="Weekly review · auto" meta="generated · 22 May 2026">
          <div className="prose prose-invert max-w-none">
            <p className="text-void-800">
              <span className="editorial text-signal-cyan">Verdict.</span> Solid week
              structurally — discipline lifted +6 points after blocking USDJPY on Tuesday.
              Two of three losses were textbook sweeps above session highs; this remains your
              dominant failure mode. Continue London-session shorts only after a 1H CHOCH
              prints below the swept level.
            </p>
            <p className="text-void-700">
              <span className="editorial text-signal-amber">Watch.</span> Tilt-resistance score is
              the lowest trait. Engage the post-stop-out lockout (30 min) — the engine will
              enable it on confirmation.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
