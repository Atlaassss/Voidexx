import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import { getNewsFeed } from "@/lib/news";
import { NewsClient } from "./NewsClient";

export const dynamic = "force-dynamic";

/**
 * /dashboard/news — global market news feed.
 *
 * Pulls 24 headlines on the server (deterministic per-hour rotation
 * so SSR + client renders stay aligned) and hands them to a client
 * component for the filter/refresh UI. The feed itself is a single
 * call into `lib/news.getNewsFeed()` — which in production would
 * fan out to wires + X + TV transcript providers.
 */
export default function NewsPage() {
  const items = getNewsFeed({ limit: 24 });
  const counts = {
    wire: items.filter((i) => ["REUTERS", "BLOOMBERG", "AP"].includes(i.source)).length,
    tv: items.filter((i) => ["CNBC", "BBC", "AL_JAZEERA", "BLOOMBERG_TV"].includes(i.source))
      .length,
    social: items.filter((i) => i.source === "X_TWITTER").length,
    crypto: items.filter((i) =>
      ["COINDESK", "THE_BLOCK", "DECRYPT"].includes(i.source),
    ).length,
  };

  return (
    <>
      <Topbar
        title="Global news"
        sub="market-moving headlines · X · TV · wires · crypto"
      />

      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Counter label="Wires" value={counts.wire} tone="cyan" sub="Reuters · Bloomberg · AP" />
          <Counter label="TV" value={counts.tv} tone="amber" sub="CNBC · BBC · Bloomberg TV" />
          <Counter label="X (Twitter)" value={counts.social} tone="violet" sub="verified handles" />
          <Counter label="Crypto" value={counts.crypto} tone="green" sub="CoinDesk · The Block" />
        </div>

        <Panel title="Live feed" meta={`${items.length} headlines · refreshes hourly`}>
          <NewsClient initialItems={items} />
        </Panel>
      </div>
    </>
  );
}

function Counter({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  tone: "cyan" | "amber" | "violet" | "green";
}) {
  const toneClass = {
    cyan: "text-signal-cyan",
    amber: "text-signal-amber",
    violet: "text-signal-violet",
    green: "text-signal-green",
  }[tone];
  return (
    <div className="cell brackets relative p-4">
      <span className="b1" />
      <span className="b2" />
      <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
        {label}
      </div>
      <div className={`mt-2 font-display text-4xl tracking-wide ${toneClass}`}>{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
        {sub}
      </div>
    </div>
  );
}
