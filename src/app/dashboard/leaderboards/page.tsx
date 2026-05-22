import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import { Trophy } from "lucide-react";

const TRADERS = [
  { rank: 1, name: "ghost.protocol", score: 98.4, win: 71, r: "+34.2R" },
  { rank: 2, name: "asia.vandal", score: 96.1, win: 68, r: "+29.7R" },
  { rank: 3, name: "kx.haunter", score: 94.0, win: 64, r: "+24.1R" },
  { rank: 4, name: "void.tape", score: 92.8, win: 62, r: "+22.6R" },
  { rank: 5, name: "you", score: 88.3, win: 62, r: "+12.4R", you: true },
  { rank: 6, name: "fvg.ronin", score: 87.4, win: 59, r: "+11.0R" },
  { rank: 7, name: "midnight.smc", score: 86.0, win: 58, r: "+10.3R" },
  { rank: 8, name: "tape.chaser", score: 84.4, win: 55, r: "+8.7R" },
];

export default function LeaderboardsPage() {
  return (
    <>
      <Topbar title="Leaderboards" sub="this week · discipline-weighted score" />

      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <Panel title="Top operators · 7D" meta="opt-in · pseudonymous">
          <div className="divide-y divide-void-300/60">
            {TRADERS.map((t) => (
              <div
                key={t.rank}
                className={`grid grid-cols-12 items-center gap-3 py-3 ${
                  t.you ? "bg-signal-green/[0.05]" : ""
                }`}
              >
                <span className="col-span-1 font-display text-2xl tracking-wide text-void-700">
                  {t.rank <= 3 ? <Trophy className="h-5 w-5 text-signal-amber" /> : `#${t.rank}`}
                </span>
                <span
                  className={`col-span-4 font-display text-xl tracking-wide ${
                    t.you ? "text-signal-green" : "text-void-900"
                  }`}
                >
                  {t.name}
                  {t.you && (
                    <span className="ml-2 chip border-signal-green/60 text-signal-green">YOU</span>
                  )}
                </span>
                <span className="col-span-3 font-mono text-[12px] text-void-700">
                  {t.win}% win
                </span>
                <span className="col-span-2 text-right font-mono text-[12px] text-signal-green">
                  {t.r}
                </span>
                <span
                  className={`col-span-2 text-right font-display text-2xl ${
                    t.you ? "text-signal-green" : "text-void-900"
                  }`}
                >
                  {t.score}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
