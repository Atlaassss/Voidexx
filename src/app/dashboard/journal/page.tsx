import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import { Search, Tag, Filter } from "lucide-react";

const ENTRIES = [
  {
    d: "22 May · 10:42",
    sym: "BTC / USDT · 1H",
    title: "Shorted into ASIA HIGH liquidity",
    score: 38,
    r: -4.2,
    tags: ["revenge", "premium", "liquidity-grab"],
  },
  {
    d: "22 May · 08:15",
    sym: "EUR / USD · 15M",
    title: "Clean OB retest in London",
    score: 91,
    r: +2.6,
    tags: ["OB", "patient", "session-A+"],
  },
  {
    d: "21 May · 21:33",
    sym: "SOL / USDT · 5M",
    title: "Stop hunt → reversal · sized down correctly",
    score: 87,
    r: +3.1,
    tags: ["stop-hunt", "discipline"],
  },
  {
    d: "21 May · 14:09",
    sym: "GBP / JPY · 1H",
    title: "FVG ignored, premium short",
    score: 44,
    r: -1.8,
    tags: ["fvg", "premium", "late-entry"],
  },
  {
    d: "20 May · 16:02",
    sym: "XAU / USD · 4H",
    title: "Late entry, 0.4R lost on stop",
    score: 58,
    r: -0.4,
    tags: ["late", "context-miss"],
  },
];

export default function JournalPage() {
  return (
    <>
      <Topbar title="Auto-journal" sub="every autopsy → tagged, searchable, replayable" />

      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 border border-void-300/70 bg-void-100/40 px-3 py-2 font-mono text-[11px]">
            <Search className="h-3.5 w-3.5 text-void-700" />
            <input
              placeholder="Search trades, tags, notes ..."
              className="flex-1 bg-transparent placeholder:text-void-600 focus:outline-none"
            />
          </div>
          <button className="btn-ghost">
            <Filter className="h-3 w-3" /> Filters
          </button>
          <button className="btn-ghost">
            <Tag className="h-3 w-3" /> Tags
          </button>
        </div>

        <Panel title="Timeline" meta={`${ENTRIES.length} entries`}>
          <ul className="divide-y divide-void-300/60">
            {ENTRIES.map((e, i) => (
              <li
                key={i}
                className="grid grid-cols-12 items-center gap-3 py-4 transition hover:bg-void-100/30"
              >
                <span className="col-span-2 font-mono text-[11px] text-void-700">{e.d}</span>
                <span className="col-span-2 font-display text-base tracking-wide">{e.sym}</span>
                <span className="col-span-4 text-sm text-void-800">{e.title}</span>
                <div className="col-span-2 flex flex-wrap gap-1">
                  {e.tags.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </div>
                <span
                  className={`col-span-1 text-right font-mono text-[12px] ${
                    e.r > 0 ? "text-signal-green" : "text-signal-red"
                  }`}
                >
                  {e.r > 0 ? "+" : ""}
                  {e.r.toFixed(1)}R
                </span>
                <span
                  className={`col-span-1 text-right font-display text-2xl ${
                    e.score >= 75
                      ? "text-signal-green"
                      : e.score >= 50
                        ? "text-signal-amber"
                        : "text-signal-red"
                  }`}
                >
                  {e.score}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
