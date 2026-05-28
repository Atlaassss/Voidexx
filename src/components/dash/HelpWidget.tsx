"use client";

import { useEffect, useRef, useState } from "react";
import {
  HelpCircle,
  X,
  BookOpen,
  Mail,
  PlayCircle,
  Keyboard,
  Sparkles,
} from "lucide-react";

const TOUR_KEY = "voidexx:onboarding-completed";

interface HelpWidgetProps {
  /**
   * If true, the help bubble will dispatch a custom event to (re)open
   * the onboarding tour. Wired by the OnboardingTour component which
   * listens for `voidexx:start-tour` on window.
   */
  canRestartTour?: boolean;
}

/**
 * Floating help bubble in the dashboard's bottom-right corner.
 *
 * Click → menu with three jumps:
 *   1. Restart onboarding tour      (custom event → OnboardingTour)
 *   2. Read the field-notes blog    (/blog)
 *   3. Email support                (mailto:support@voidexx.io)
 *   4. Keyboard shortcuts            (alert-style modal — covers ⌘K, etc.)
 *
 * All routes/actions are real — no fake "coming soon" stuff. Lives in
 * the dashboard layout so every authed page picks it up automatically.
 */
export function HelpWidget({ canRestartTour = true }: HelpWidgetProps) {
  const [open, setOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  function restartTour() {
    setOpen(false);
    try {
      window.localStorage.removeItem(TOUR_KEY);
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent("voidexx:start-tour"));
  }

  return (
    <>
      <div
        ref={ref}
        className="pointer-events-auto fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6"
      >
        {open && (
          <div
            role="menu"
            className="brackets cell mb-3 w-[280px] bg-void-50/95 shadow-2xl backdrop-blur"
          >
            <span className="b1" />
            <span className="b2" />
            <div className="cell-header">
              <span>Help</span>
              <span className="text-void-700">v0.1.0</span>
            </div>
            <ul className="divide-y divide-void-300/60">
              {canRestartTour && (
                <MenuItem
                  icon={Sparkles}
                  label="Restart onboarding tour"
                  onClick={restartTour}
                />
              )}
              <MenuItem
                icon={Keyboard}
                label="Keyboard shortcuts"
                onClick={() => {
                  setOpen(false);
                  setShortcuts(true);
                }}
              />
              <MenuItem
                icon={BookOpen}
                label="Read the field notes"
                href="/blog"
              />
              <MenuItem
                icon={PlayCircle}
                label="Live demo (marketing site)"
                href="/#demo"
              />
              <MenuItem
                icon={Mail}
                label="Email support"
                href="mailto:support@voidexx.io?subject=VOIDEXX support"
                external
              />
            </ul>
            <div className="border-t border-void-300/60 px-4 py-2 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
              SLA · 24h on weekdays
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close help" : "Open help"}
          aria-expanded={open}
          className="grid h-12 w-12 place-items-center border border-signal-cyan/60 bg-void-50/95 text-signal-cyan shadow-2xl backdrop-blur transition hover:bg-signal-cyan hover:text-void-0"
        >
          {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
        </button>
      </div>

      {shortcuts && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-void-0/80 p-4 backdrop-blur-sm"
          onClick={() => setShortcuts(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="brackets cell relative w-full max-w-md p-6"
          >
            <span className="b1" />
            <span className="b2" />
            <button
              type="button"
              onClick={() => setShortcuts(false)}
              aria-label="Close"
              className="absolute right-3 top-3 text-void-700 hover:text-signal-red"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="font-mono text-[10px] uppercase tracking-widest3 text-signal-cyan">
              // keyboard
            </div>
            <h2 className="display-crush mt-2 text-3xl">Shortcuts</h2>
            <dl className="mt-5 divide-y divide-void-300/60 font-mono text-[12px]">
              <KeyRow keys={["⌘", "K"]} label="Open command palette" />
              <KeyRow keys={["Esc"]} label="Close any modal/popover" />
              <KeyRow keys={["↑", "↓"]} label="Navigate command palette" />
              <KeyRow keys={["Enter"]} label="Select command" />
            </dl>
          </div>
        </div>
      )}
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  href,
  external,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
}) {
  const className =
    "flex w-full items-center gap-3 px-4 py-2.5 text-left font-mono text-[11px] text-void-900 transition hover:bg-signal-cyan/[0.08] hover:text-signal-cyan";
  if (href) {
    return (
      <li>
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className={className}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          {label}
        </a>
      </li>
    );
  }
  return (
    <li>
      <button type="button" onClick={onClick} className={className}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </button>
    </li>
  );
}

function KeyRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-void-800">{label}</span>
      <span className="flex gap-1">
        {keys.map((k) => (
          <kbd
            key={k}
            className="border border-void-300 bg-void-100/60 px-1.5 py-0.5 text-[10px] uppercase text-void-900"
          >
            {k}
          </kbd>
        ))}
      </span>
    </div>
  );
}
