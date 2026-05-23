"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Compass, FileText, ScrollText, Settings, Sparkles, Wallet, Activity, Brain } from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  hint: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
}

const COMMANDS: CommandItem[] = [
  { id: "cmd-upload", label: "New autopsy", hint: "Upload a screenshot", href: "/dashboard/upload", icon: Sparkles, keywords: ["new", "screenshot", "trade", "autopsy"] },
  { id: "cmd-cmd", label: "Command Center", hint: "KPIs and equity curve", href: "/dashboard", icon: Compass, keywords: ["home", "overview"] },
  { id: "cmd-journal", label: "Auto-journal", hint: "Past autopsies, searchable", href: "/dashboard/journal", icon: ScrollText, keywords: ["log", "history"] },
  { id: "cmd-analytics", label: "Analytics", hint: "Equity, PnL, archetype curves", href: "/dashboard/analytics", icon: Activity },
  { id: "cmd-psych", label: "Psychology", hint: "Tilt, discipline, conviction", href: "/dashboard/psychology", icon: Brain, keywords: ["tilt", "fomo"] },
  { id: "cmd-auto", label: "Automation", hint: "Exchange links and risk caps", href: "/dashboard/automation", icon: Activity, keywords: ["bingx", "exchange"] },
  { id: "cmd-billing", label: "Billing", hint: "Plan, usage, invoices", href: "/dashboard/billing", icon: Wallet, keywords: ["upgrade", "plan", "stripe", "paymongo", "gcash"] },
  { id: "cmd-referrals", label: "Referrals", hint: "Share code, rewards", href: "/dashboard/referrals", icon: Sparkles, keywords: ["affiliate", "share"] },
  { id: "cmd-learn", label: "Learn", hint: "ICT/SMC tracks", href: "/dashboard/learn", icon: FileText, keywords: ["course", "tutor"] },
  { id: "cmd-settings", label: "Settings", hint: "Account, security, preferences", href: "/dashboard/settings", icon: Settings },
  { id: "cmd-blog", label: "Field notes", hint: "Blog · trader essays", href: "/blog", icon: FileText, keywords: ["articles"] },
];

/**
 * Topbar search field. Opens a Cmd-K-style command palette.
 *
 * In demo mode (no real DB / OpenSearch behind us), the palette
 * indexes the dashboard itself — every page, every common action.
 * Filtering is in-memory and constant-time.
 *
 * Keyboard:
 *   - Cmd/Ctrl + K → open
 *   - ↑/↓ → move highlight
 *   - Enter → navigate
 *   - Esc → close
 */
export function TopbarSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl-K → open. ESC → close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus when opened, reset state when closed.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQ("");
      setActive(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!q.trim()) return COMMANDS;
    const term = q.trim().toLowerCase();
    return COMMANDS.filter((c) => {
      const hay =
        c.label.toLowerCase() +
        " " +
        c.hint.toLowerCase() +
        " " +
        (c.keywords ?? []).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [q]);

  // Keep `active` in range as filter changes.
  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered.length, active]);

  function navigate(item: CommandItem) {
    setOpen(false);
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[active];
      if (item) navigate(item);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="hidden items-center gap-2 border border-void-300/70 bg-void-100/60 px-3 py-1.5 font-mono text-[11px] text-void-700 transition hover:border-signal-cyan/40 hover:text-signal-cyan md:flex"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="w-64 truncate text-left">Search trades, journals, sessions</span>
        <span className="ml-2 border border-void-300 px-1 text-[10px]">⌘ K</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          className="fixed inset-0 z-[80] grid place-items-start bg-void-0/80 p-4 pt-24 backdrop-blur-sm sm:p-8 sm:pt-32"
        >
          <div className="brackets cell relative mx-auto w-full max-w-xl bg-void-50/95 shadow-2xl">
            <span className="b1" />
            <span className="b2" />

            <div className="flex items-center gap-2 border-b border-void-300/70 px-4 py-3">
              <Search className="h-4 w-4 text-signal-cyan" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type to filter — pages, modules, actions"
                className="flex-1 bg-transparent font-mono text-[13px] text-void-900 placeholder:text-void-700 focus:outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <span className="border border-void-300 px-1 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                Esc
              </span>
            </div>

            <ul className="max-h-[60vh] overflow-y-auto py-2">
              {filtered.length === 0 && (
                <li className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-widest2 text-void-700">
                  No matches.
                </li>
              )}
              {filtered.map((c, i) => {
                const Icon = c.icon;
                const isActive = i === active;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => navigate(c)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                        isActive
                          ? "bg-signal-cyan/[0.08] text-signal-cyan"
                          : "text-void-900 hover:bg-void-100/60"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-signal-cyan" : "text-void-700"}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[12px]">
                          {c.label}
                        </span>
                        <span className="block truncate font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                          {c.hint}
                        </span>
                      </span>
                      <ArrowRight
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isActive ? "text-signal-cyan" : "text-void-700/0"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between border-t border-void-300/70 px-4 py-2 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
              <span>↑↓ navigate · enter select</span>
              <span>{filtered.length} of {COMMANDS.length}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
