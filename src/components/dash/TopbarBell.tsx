"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";

/**
 * Notification bell with a popover panel. In demo mode it shows a
 * curated set of mock notifications drawn from the marketing
 * scenarios so it feels lived-in rather than empty.
 *
 * The unread badge dot disappears once the popover is opened and
 * "Mark all read" is clicked. State is in-memory only — re-mounts
 * (route changes etc) reset it. Real persistence is Phase 8 with
 * the `Notification` Prisma model already in the schema.
 */
interface NotificationItem {
  id: string;
  tone: "info" | "success" | "warn";
  title: string;
  body: string;
  when: string;
  read?: boolean;
}

const SEED: NotificationItem[] = [
  {
    id: "n1",
    tone: "warn",
    title: "Tilt threshold approaching",
    body: "3 losing autopsies in 4h. Composite tilt index at 71/100.",
    when: "12m ago",
  },
  {
    id: "n2",
    tone: "info",
    title: "Autopsy ready",
    body: "BTC short · 1H · score 38 · liquidity-grab flag.",
    when: "27m ago",
  },
  {
    id: "n3",
    tone: "success",
    title: "Quota reset",
    body: "Free monthly autopsies counter has rolled over.",
    when: "1d ago",
    read: true,
  },
];

export function TopbarBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(SEED);
  const ref = useRef<HTMLDivElement>(null);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const unread = items.filter((i) => !i.read).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
        className="relative grid h-9 w-9 place-items-center border border-void-300/70 bg-void-100/40 text-void-700 transition hover:text-signal-cyan"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-signal-amber"
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-40 mt-2 w-[min(360px,90vw)] cell brackets bg-void-50/95 shadow-2xl backdrop-blur"
        >
          <span className="b1" />
          <span className="b2" />
          <div className="cell-header">
            <span>Notifications</span>
            <button
              type="button"
              onClick={() =>
                setItems((arr) => arr.map((i) => ({ ...i, read: true })))
              }
              className="flex items-center gap-1 text-void-700 hover:text-signal-green disabled:opacity-50"
              disabled={unread === 0}
            >
              <Check className="h-3 w-3" />
              Mark all read
            </button>
          </div>
          <ul className="max-h-[360px] divide-y divide-void-300/60 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-6 text-center font-mono text-[11px] text-void-700">
                Inbox empty.
              </li>
            )}
            {items.map((n) => (
              <li
                key={n.id}
                className={`px-4 py-3 ${!n.read ? "bg-void-100/40" : ""}`}
              >
                <div className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-widest2">
                  <span
                    className={
                      n.tone === "warn"
                        ? "text-signal-amber"
                        : n.tone === "success"
                          ? "text-signal-green"
                          : "text-signal-cyan"
                    }
                  >
                    ● {n.title}
                  </span>
                  <span className="ml-auto text-void-700">{n.when}</span>
                </div>
                <p className="mt-1 text-[12px] leading-snug text-void-800">
                  {n.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
