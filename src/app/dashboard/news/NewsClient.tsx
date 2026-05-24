"use client";

import { useMemo, useState } from "react";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { SOURCE_META, relativeTime, type NewsItem, type NewsSource } from "@/lib/news";

type Filter = "ALL" | "WIRE" | "TV" | "SOCIAL" | "CRYPTO";

const FILTERS: { id: Filter; label: string; sub: string }[] = [
  { id: "ALL", label: "All", sub: "everything" },
  { id: "WIRE", label: "Wires", sub: "Reuters · Bloomberg · AP" },
  { id: "TV", label: "TV", sub: "CNBC · BBC · Al Jazeera" },
  { id: "SOCIAL", label: "X", sub: "verified · trader sentiment" },
  { id: "CRYPTO", label: "Crypto", sub: "CoinDesk · The Block" },
];

interface NewsClientProps {
  initialItems: NewsItem[];
}

/**
 * Client side of /dashboard/news. Receives the SSR'd feed, lets the
 * user flip media filters, and refreshes via /api/news. The "live"
 * badge isn't fake-live: the API's per-hour rotation means a refresh
 * inside the same hour returns the same payload — we surface that
 * honestly with the "next rotation in Xm" indicator.
 */
export function NewsClient({ initialItems }: NewsClientProps) {
  const [items, setItems] = useState<NewsItem[]>(initialItems);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "ALL") return items;
    return items.filter((i) => SOURCE_META[i.source].medium === filter);
  }, [items, filter]);

  async function refresh() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/news?limit=24", { cache: "no-store" });
      const data = (await res.json()) as { items: NewsItem[] };
      if (!res.ok || !Array.isArray(data.items)) throw new Error("refresh_failed");
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
    } finally {
      setBusy(false);
    }
  }

  const minutesUntilRotation = nextHourMinutes();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`chip ${
                filter === f.id
                  ? "border-signal-green/60 bg-signal-green/[0.08] text-signal-green"
                  : "border-void-300/60 text-void-700 hover:border-void-400"
              }`}
              title={f.sub}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            next rotation in {minutesUntilRotation}m
          </span>
          <button
            onClick={refresh}
            disabled={busy}
            className="btn-ghost px-3 py-1 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-signal-red/40 bg-signal-red/[0.06] p-3 font-mono text-[11px] text-signal-red">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="grid place-items-center py-12 text-center text-void-700">
          <span className="font-mono text-[11px] uppercase tracking-widest2">
            No headlines for this filter yet
          </span>
        </div>
      ) : (
        <ul className="divide-y divide-void-300/60 border border-void-300/70">
          {filtered.map((item) => (
            <NewsRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  const meta = SOURCE_META[item.source];
  const toneText = toneClass(meta.tone);
  const biasDot =
    item.bias === "BULLISH"
      ? "bg-signal-green"
      : item.bias === "BEARISH"
        ? "bg-signal-red"
        : "bg-void-600";

  return (
    <li className="grid grid-cols-12 items-start gap-3 px-4 py-3 transition hover:bg-void-100/40">
      <div className="col-span-12 flex flex-wrap items-center gap-2 sm:col-span-3">
        <span className={`chip border ${toneText}`}>
          {meta.medium === "SOCIAL" && "𝕏 "}
          {meta.label}
        </span>
        {item.authorHandle && (
          <span className="font-mono text-[11px] text-void-700">
            {item.authorHandle}
            {item.authorVerified && (
              <span className="ml-1 text-signal-cyan" title="verified">
                ✓
              </span>
            )}
          </span>
        )}
        <span className="font-mono text-[10px] uppercase tracking-widest2 text-void-600">
          {relativeTime(item.publishedAt)}
        </span>
      </div>

      <div className="col-span-12 sm:col-span-7">
        <div className="font-display text-base leading-snug tracking-wide text-void-900">
          {item.headline}
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-void-700">{item.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.tickers.slice(0, 5).map((t) => (
            <span key={t} className="chip border-void-300/70 text-void-800">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="col-span-12 flex items-center justify-between sm:col-span-2 sm:flex-col sm:items-end sm:justify-start sm:gap-2">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
          <span className={`h-1.5 w-1.5 rounded-full ${biasDot}`} />
          {item.bias}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
          impact {item.impact}/5
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest2 text-signal-cyan hover:text-signal-green"
          >
            open <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </li>
  );
}

function toneClass(tone: "cyan" | "amber" | "violet" | "green" | "red"): string {
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

function nextHourMinutes(): number {
  const now = new Date();
  return 60 - now.getUTCMinutes();
}
