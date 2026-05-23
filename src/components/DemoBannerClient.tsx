"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "voidexx:demo-banner-dismissed";

/**
 * Client-side body of the demo banner.
 *
 * Server component (`DemoBanner`) decides whether to render this at
 * all — based on env config + the NEXT_PUBLIC_HIDE_DEMO_BANNER flag.
 * Once mounted, this component handles the in-session dismiss:
 *
 *   - User clicks ×  → banner disappears for the rest of the tab
 *     session (sessionStorage; survives navigation but not a tab close).
 *   - Open in a new tab → banner is back.
 *   - Want it gone permanently for screenshots / client demos →
 *     set NEXT_PUBLIC_HIDE_DEMO_BANNER=1 in `.env.local`.
 *
 * The dismiss button is on the banner itself, far right, with an
 * accessible label and the same monospace HUD chip aesthetic.
 */
export function DemoBannerClient({ missing }: { missing: string[] }) {
  // Render server-rendered HTML on first paint (matches SSR), then
  // hydrate and check sessionStorage — avoids a flash of "banner ↦
  // gone" on every page load when the user has previously dismissed.
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      // ignore — storage disabled in private mode
    }
    setHydrated(true);
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // best-effort
    }
  }

  if (hydrated && dismissed) return null;

  return (
    <div className="relative z-[60] border-b border-signal-amber/30 bg-signal-amber/[0.04]">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest2 text-signal-amber sm:px-6">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal-amber" />
        <span>Demo mode</span>
        <span className="hidden sm:inline text-void-700">
          unwired: {missing.map((m) => `[${m}]`).join(" ")}
        </span>
        <span className="ml-auto hidden md:inline text-void-700">
          configure live services →{" "}
          <a
            href="https://github.com/Atlaassss/Voidexx#run-locally"
            target="_blank"
            rel="noreferrer"
            className="text-signal-cyan transition hover:text-signal-amber"
          >
            README · launch checklist
          </a>
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss demo banner for this session"
          className="ml-2 grid h-5 w-5 place-items-center text-void-700 transition hover:text-signal-red"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
