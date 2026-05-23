"use client";

import { useMemo, useState } from "react";
import { Search, Tag, Filter, X } from "lucide-react";

export interface JournalEntry {
  d: string;
  sym: string;
  title: string;
  score: number;
  r: number;
  tags: string[];
}

interface JournalClientProps {
  entries: JournalEntry[];
}

type Outcome = "all" | "wins" | "losses";

/**
 * Client-side journal browser. Powers:
 *
 *   - The search input (matches symbol / title / tags / date prefix).
 *   - Filters dropdown: outcome (all / wins / losses) and a min-score
 *     slider that lops off the noise.
 *   - Tags dropdown: union-select of every distinct tag in the dataset;
 *     active tags become removable chips above the timeline.
 *
 * All filtering is in-memory — there's no journal API yet so the
 * dataset is whatever the server passes us. Migrating this to a real
 * `/api/trades?q=...` is a one-liner once the route lands (Phase 8).
 */
export function JournalClient({ entries }: JournalClientProps) {
  const [q, setQ] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [minScore, setMinScore] = useState(0);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [openMenu, setOpenMenu] = useState<"filters" | "tags" | null>(null);

  // Distinct tag list, sorted by frequency desc.
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [entries]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (term) {
        const hay = `${e.sym} ${e.title} ${e.tags.join(" ")} ${e.d}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (outcome === "wins" && e.r <= 0) return false;
      if (outcome === "losses" && e.r >= 0) return false;
      if (e.score < minScore) return false;
      if (activeTags.length > 0 && !activeTags.every((t) => e.tags.includes(t))) {
        return false;
      }
      return true;
    });
  }, [entries, q, outcome, minScore, activeTags]);

  function toggleTag(t: string) {
    setActiveTags((arr) => (arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]));
  }

  function clearFilters() {
    setQ("");
    setOutcome("all");
    setMinScore(0);
    setActiveTags([]);
  }

  const filtersActive =
    q.trim().length > 0 ||
    outcome !== "all" ||
    minScore > 0 ||
    activeTags.length > 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 border border-void-300/70 bg-void-100/40 px-3 py-2 font-mono text-[11px]">
          <Search className="h-3.5 w-3.5 text-void-700" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search trades, tags, notes ..."
            className="flex-1 bg-transparent text-void-900 placeholder:text-void-600 focus:outline-none"
            spellCheck={false}
            autoComplete="off"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="text-void-700 hover:text-signal-red"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === "filters" ? null : "filters")}
            aria-expanded={openMenu === "filters"}
            className={`btn-ghost ${openMenu === "filters" ? "border-signal-cyan/60 text-signal-cyan" : ""}`}
          >
            <Filter className="h-3 w-3" /> Filters
            {(outcome !== "all" || minScore > 0) && (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-signal-cyan" />
            )}
          </button>
          {openMenu === "filters" && (
            <Popover onClose={() => setOpenMenu(null)}>
              <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                Outcome
              </div>
              <div className="mt-2 flex gap-1">
                {(["all", "wins", "losses"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOutcome(o)}
                    className={`flex-1 border px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest2 transition ${
                      outcome === o
                        ? "border-signal-cyan/60 bg-signal-cyan/[0.10] text-signal-cyan"
                        : "border-void-300/70 text-void-700 hover:border-signal-cyan/40 hover:text-signal-cyan"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                <span>Min score</span>
                <span className="text-signal-cyan">{minScore}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="mt-2 w-full accent-signal-cyan"
                aria-label="Minimum score"
              />
            </Popover>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === "tags" ? null : "tags")}
            aria-expanded={openMenu === "tags"}
            className={`btn-ghost ${openMenu === "tags" ? "border-signal-cyan/60 text-signal-cyan" : ""}`}
          >
            <Tag className="h-3 w-3" /> Tags
            {activeTags.length > 0 && (
              <span className="ml-1 inline-block min-w-[1rem] rounded-full bg-signal-cyan/80 px-1 font-mono text-[10px] text-void-0">
                {activeTags.length}
              </span>
            )}
          </button>
          {openMenu === "tags" && (
            <Popover onClose={() => setOpenMenu(null)}>
              <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                {allTags.length} distinct tags
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {allTags.map((t) => {
                  const on = activeTags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest2 transition ${
                        on
                          ? "border-signal-cyan/60 bg-signal-cyan/[0.12] text-signal-cyan"
                          : "border-void-300 text-void-700 hover:border-signal-cyan/40"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </Popover>
          )}
        </div>

        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="font-mono text-[10px] uppercase tracking-widest2 text-void-700 transition hover:text-signal-red"
          >
            Clear all
          </button>
        )}
      </div>

      {activeTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            filtering on:
          </span>
          {activeTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTag(t)}
              className="inline-flex items-center gap-1 border border-signal-cyan/60 bg-signal-cyan/[0.10] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest2 text-signal-cyan transition hover:bg-signal-cyan/[0.20]"
            >
              {t}
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
        </div>
      )}

      <ul className="divide-y divide-void-300/60">
        {filtered.length === 0 ? (
          <li className="py-8 text-center font-mono text-[11px] uppercase tracking-widest2 text-void-700">
            No entries match the current filters.
          </li>
        ) : (
          filtered.map((e, i) => (
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
          ))
        )}
      </ul>
      <div className="border-t border-void-300/60 pt-3 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
        showing {filtered.length} of {entries.length}
      </div>
    </>
  );
}

function Popover({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        className="absolute right-0 top-full z-40 mt-2 w-72 cell brackets bg-void-50/95 p-3 shadow-2xl"
      >
        <span className="b1" />
        <span className="b2" />
        {children}
      </div>
    </>
  );
}
