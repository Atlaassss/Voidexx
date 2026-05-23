import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import { BookOpen, GraduationCap, PlayCircle } from "lucide-react";

const TRACKS = [
  {
    name: "ICT foundations",
    items: 12,
    progress: 67,
    blurb: "Liquidity, FVG, OB, CHoCH, BOS — explained without the cult.",
  },
  {
    name: "SMC for retail",
    items: 9,
    progress: 22,
    blurb: "Smart-money concepts translated into entry rules you can backtest.",
  },
  {
    name: "Session playbook",
    items: 14,
    progress: 0,
    blurb: "Asia / London / NY sessions — what each tape actually wants.",
  },
  {
    name: "Risk + psychology",
    items: 10,
    progress: 90,
    blurb: "Position sizing, drawdown maths, tilt management.",
  },
];

const RECOMMENDED = [
  "Asia-session liquidity, deconstructed",
  "Why your stop-loss keeps getting hunted",
  "Premium vs. discount in 3 minutes",
  "The 4H order block mechanism, end to end",
];

export default function LearnPage() {
  return (
    <>
      <Topbar title="Learn" sub="AI tutor · interactive lessons · track progress" />

      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel title="Tracks" className="xl:col-span-2">
            <div className="grid grid-cols-1 gap-px bg-void-300/60 sm:grid-cols-2">
              {TRACKS.map((t) => (
                <div key={t.name} className="bg-void-50/60 p-5">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                    <BookOpen className="h-3 w-3" />
                    {t.items} units
                  </div>
                  <div className="mt-2 font-display text-2xl tracking-wide">{t.name}</div>
                  <p className="mt-1 text-sm text-void-700">{t.blurb}</p>
                  <div className="mt-4 h-1.5 w-full bg-void-300/60">
                    <div
                      className={`h-full ${
                        t.progress > 75
                          ? "bg-signal-green"
                          : t.progress > 25
                            ? "bg-signal-cyan"
                            : "bg-signal-amber"
                      }`}
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                    {t.progress}% complete
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Personalised next" meta="based on your last losses">
            <ul className="space-y-2">
              {RECOMMENDED.map((r) => (
                <li
                  key={r}
                  className="flex items-center gap-3 border border-void-300/70 bg-void-100/40 px-3 py-2.5 transition hover:border-signal-cyan/60"
                >
                  <PlayCircle className="h-4 w-4 text-signal-cyan" />
                  <span className="flex-1 text-sm text-void-900">{r}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                    14m
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel title="AI tutor" meta="ask anything">
          <div className="flex items-start gap-3 border border-void-300/70 bg-void-100/40 p-4">
            <GraduationCap className="h-5 w-5 shrink-0 text-signal-violet" />
            <div className="flex-1">
              <div className="font-mono text-[10px] uppercase tracking-widest2 text-signal-violet">
                Tutor
              </div>
              <p className="mt-1 text-sm text-void-800">
                Pick any candle on a chart and ask &ldquo;why did this happen?&rdquo;. The tutor
                walks the structure with you, citing concepts from your tracks.
              </p>
              <button
                type="button"
                disabled
                title="Tutor sessions are wired with the live AI engine — set OPENAI_API_KEY to enable."
                className="btn-ghost mt-3 cursor-not-allowed opacity-50"
              >
                Start a session →
              </button>
              <span className="ml-2 font-mono text-[10px] uppercase tracking-widest2 text-signal-amber">
                Phase 8 · needs OPENAI_API_KEY
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
