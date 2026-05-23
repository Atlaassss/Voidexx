import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import { JournalClient, type JournalEntry } from "./JournalClient";

const ENTRIES: JournalEntry[] = [
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
        <Panel title="Timeline" meta={`${ENTRIES.length} entries`}>
          <div className="space-y-4">
            <JournalClient entries={ENTRIES} />
          </div>
        </Panel>
      </div>
    </>
  );
}
