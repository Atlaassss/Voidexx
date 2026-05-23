"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { dismissToast, subscribe, type Toast } from "@/lib/toast";

/**
 * Single global mount point for toasts. Lives at the root of the
 * layout tree so any client surface can publish via `toast.*`.
 *
 * The card stack is positioned bottom-right with `pointer-events-none`
 * on the wrapper so toasts never block the underlying UI; each
 * individual card opts back into pointer events for its dismiss button.
 */
export function Toaster() {
  const [queue, setQueue] = useState<Toast[]>([]);

  useEffect(() => subscribe(setQueue), []);

  if (queue.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6"
      role="region"
      aria-label="Notifications"
    >
      {queue.map((t) => (
        <ToastCard key={t.id} t={t} />
      ))}
    </div>
  );
}

function ToastCard({ t }: { t: Toast }) {
  const palette = TONE_STYLES[t.tone];
  return (
    <div
      role="status"
      className={`pointer-events-auto relative flex items-start gap-3 border bg-void-50/95 p-3 backdrop-blur-sm shadow-lg animate-rise ${palette.border} ${palette.bg}`}
    >
      <span
        className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 animate-pulse-dot rounded-full ${palette.dot}`}
      />
      <div className="min-w-0 flex-1">
        <div
          className={`font-mono text-[11px] uppercase tracking-widest2 ${palette.title}`}
        >
          {t.title}
        </div>
        {t.detail && (
          <div className="mt-0.5 text-[12px] leading-snug text-void-800">
            {t.detail}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(t.id)}
        aria-label="Dismiss"
        className="ml-1 mt-0.5 shrink-0 text-void-700 hover:text-signal-red transition"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

const TONE_STYLES: Record<
  Toast["tone"],
  { border: string; bg: string; dot: string; title: string }
> = {
  info: {
    border: "border-signal-cyan/50",
    bg: "bg-signal-cyan/[0.04]",
    dot: "bg-signal-cyan",
    title: "text-signal-cyan",
  },
  success: {
    border: "border-signal-green/50",
    bg: "bg-signal-green/[0.04]",
    dot: "bg-signal-green",
    title: "text-signal-green",
  },
  error: {
    border: "border-signal-red/50",
    bg: "bg-signal-red/[0.04]",
    dot: "bg-signal-red",
    title: "text-signal-red",
  },
  demo: {
    border: "border-signal-amber/50",
    bg: "bg-signal-amber/[0.04]",
    dot: "bg-signal-amber",
    title: "text-signal-amber",
  },
};
