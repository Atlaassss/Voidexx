"use client";

import { useEffect, useState } from "react";

/**
 * Real preference toggles for the Settings page.
 *
 * Replaces the previous decorative `<span>` switches that animated but
 * had no state. Each toggle is a button with `role="switch"` and
 * `aria-checked`, persisted to localStorage so the choice survives
 * page reloads in demo mode. When real account-prefs API ships
 * (Phase 8), this component swaps `localStorage` for the API.
 */
const TOGGLES = [
  { key: "pref:daily-insight", label: "Daily AI insight email", defaultOn: true },
  { key: "pref:tilt-push", label: "Tilt detector push", defaultOn: true },
  { key: "pref:funding-alerts", label: "Funding-rate alerts", defaultOn: false },
  { key: "pref:discord-webhooks", label: "Discord webhooks", defaultOn: false },
] as const;

export function SettingsToggles() {
  return (
    <div className="space-y-0">
      {TOGGLES.map((t) => (
        <Toggle key={t.key} storageKey={t.key} label={t.label} defaultOn={t.defaultOn} />
      ))}
    </div>
  );
}

function Toggle({
  storageKey,
  label,
  defaultOn,
}: {
  storageKey: string;
  label: string;
  defaultOn: boolean;
}) {
  // Start with the SSR default; hydrate from localStorage on mount so we
  // don't introduce a hydration mismatch.
  const [on, setOn] = useState(defaultOn);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored !== null) setOn(stored === "1");
    } catch {
      // ignore — private mode or storage disabled
    }
    setHydrated(true);
  }, [storageKey]);

  function toggle() {
    const next = !on;
    setOn(next);
    try {
      window.localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {
      // best-effort persistence
    }
  }

  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-void-900">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`Toggle ${label}`}
        onClick={toggle}
        // Block the click visually until hydrated to avoid an
        // accidental flip during the brief SSR-to-CSR window.
        disabled={!hydrated}
        className={`relative inline-block h-5 w-10 cursor-pointer border transition disabled:cursor-not-allowed ${
          on
            ? "border-signal-green bg-signal-green/20"
            : "border-void-400 bg-void-200 hover:border-void-500"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 transition-all ${
            on
              ? "left-[calc(100%-14px)] bg-signal-green"
              : "left-1 bg-void-700"
          }`}
        />
      </button>
    </div>
  );
}
