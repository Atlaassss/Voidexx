import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getNewsFeed, SOURCE_META, relativeTime } from "@/lib/news";

/**
 * Compact news rail for the Command Center.
 *
 * Pulls 6 high-impact headlines synchronously from the in-process
 * `getNewsFeed()` (deterministic per-hour rotation — no network) and
 * renders a tight list. Below the list, a "View full feed →" link
 * routes to /dashboard/news.
 *
 * The rail is medium-aware (X / TV / wires / crypto) but doesn't
 * filter — the dashboard wants the most market-moving headlines
 * regardless of source.
 */
export function NewsRail() {
  // Fetch a few extra and trim by impact so the dashboard surfaces
  // the highest-impact items first regardless of rotation order.
  const items = getNewsFeed({ limit: 12 })
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 6);

  return (
    <div className="space-y-3">
      <ul className="space-y-2 font-mono text-[12px]">
        {items.map((it) => {
          const meta = SOURCE_META[it.source];
          const tone = toneText(meta.tone);
          const biasDot =
            it.bias === "BULLISH"
              ? "bg-signal-green"
              : it.bias === "BEARISH"
                ? "bg-signal-red"
                : "bg-void-600";
          return (
            <li
              key={it.id}
              className="border-l-2 border-void-300 pl-3 hover:border-signal-cyan transition-colors"
            >
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest2">
                <span className={`chip border ${tone}`}>
                  {meta.medium === "SOCIAL" ? "𝕏 " : ""}
                  {meta.label}
                </span>
                <span className="text-void-600">{relativeTime(it.publishedAt)}</span>
                <span className={`ml-auto inline-flex items-center gap-1 text-void-700`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${biasDot}`} />
                  {it.bias}
                </span>
              </div>
              <div className="mt-1 font-display text-sm leading-snug tracking-wide text-void-900">
                {it.headline}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {it.tickers.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="border border-void-300/60 px-1.5 py-0.5 text-[9px] uppercase tracking-widest2 text-void-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <Link
        href="/dashboard/news"
        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest2 text-signal-cyan hover:text-signal-green transition-colors"
      >
        Full feed
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function toneText(tone: "cyan" | "amber" | "violet" | "green" | "red"): string {
  switch (tone) {
    case "cyan":
      return "border-signal-cyan/40 text-signal-cyan";
    case "amber":
      return "border-signal-amber/40 text-signal-amber";
    case "violet":
      return "border-signal-violet/40 text-signal-violet";
    case "green":
      return "border-signal-green/40 text-signal-green";
    case "red":
      return "border-signal-red/40 text-signal-red";
  }
}
