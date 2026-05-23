"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Crosshair, Sparkles, Wallet, X } from "lucide-react";

const TOUR_KEY = "voidexx:onboarding-completed";

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref?: string;
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    eyebrow: "Step 01 · Run an autopsy",
    title: "Drop the trade.",
    body: "Upload a screenshot of a closed trade — TradingView, BingX, MT5, anything. The engine reads candles, structure, your entry / stop / target, and writes a forensic report on what actually took your stop.",
    ctaLabel: "Open Trade Autopsy",
    ctaHref: "/dashboard/upload",
  },
  {
    icon: Crosshair,
    eyebrow: "Step 02 · Read the verdict",
    title: "Score, flags, plan.",
    body: "Every report scores 0–100 against a transparent rule (not the model — auditable). Flags name the smart-money mechanic. Improvement plan tells you exactly what to do next time. All cited from the chart you uploaded.",
    ctaLabel: "View sample report",
    ctaHref: "/dashboard",
  },
  {
    icon: Wallet,
    eyebrow: "Step 03 · Stay free or upgrade",
    title: "5 autopsies / month.",
    body: "Free forever on the Recon tier. Upgrade to Operator (USD via Stripe, ₱1,344 via GCash / Maya / GrabPay) for unlimited autopsies plus the smart-money decoder, exchange automation, and zero ads.",
    ctaLabel: "See pricing",
    ctaHref: "/dashboard/billing",
  },
];

/**
 * First-visit onboarding tour modal.
 *
 * Triggers on:
 *   - First load of any /dashboard route when localStorage[TOUR_KEY] is unset
 *   - Custom event `voidexx:start-tour` (dispatched by HelpWidget)
 *
 * Skippable any time. Sets `voidexx:onboarding-completed=1` on finish OR
 * skip so we don't re-prompt. The Help widget's "Restart tour" item
 * removes the key + dispatches the event.
 *
 * Demo-mode aware: if NEXT_PUBLIC_HIDE_DEMO_BANNER=1 (the "client preview"
 * flag), we still show the tour — it's USER onboarding, not a dev signal.
 */
export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Decide whether to auto-open on mount (first visit).
  useEffect(() => {
    try {
      const done = window.localStorage.getItem(TOUR_KEY);
      if (!done) setOpen(true);
    } catch {
      // localStorage disabled — show every time, that's fine.
      setOpen(true);
    }

    // Subscribe to the "start-tour" custom event from HelpWidget.
    const onStart = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("voidexx:start-tour", onStart);
    return () => window.removeEventListener("voidexx:start-tour", onStart);
  }, []);

  function close(completed: boolean) {
    setOpen(false);
    try {
      window.localStorage.setItem(TOUR_KEY, completed ? "1" : "skipped");
    } catch {
      // best-effort
    }
  }

  function next() {
    if (step >= STEPS.length - 1) {
      close(true);
    } else {
      setStep((s) => s + 1);
    }
  }

  if (!open) return null;
  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-void-0/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding tour"
    >
      <div className="brackets cell relative w-full max-w-lg p-8">
        <span className="b1" />
        <span className="b2" />
        <button
          type="button"
          onClick={() => close(false)}
          aria-label="Skip tour"
          className="absolute right-3 top-3 text-void-700 hover:text-signal-red"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center border border-signal-cyan/60 bg-signal-cyan/[0.08] text-signal-cyan">
            <Icon className="h-5 w-5" />
          </span>
          <div className="font-mono text-[10px] uppercase tracking-widest3 text-signal-cyan">
            {s.eyebrow}
          </div>
        </div>

        <h2 className="display-crush mt-4 text-4xl leading-none">{s.title}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-void-800">{s.body}</p>

        {/* Step pips */}
        <div className="mt-6 flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              aria-label={`Jump to step ${i + 1}`}
              aria-current={i === step ? "step" : undefined}
              className={`h-1 transition-all ${
                i === step
                  ? "w-8 bg-signal-cyan"
                  : "w-3 bg-void-300 hover:bg-void-400"
              }`}
            />
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => close(false)}
            className="font-mono text-[11px] uppercase tracking-widest2 text-void-700 transition hover:text-signal-red"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-3">
            {s.ctaHref && isLast && (
              <a
                href={s.ctaHref}
                onClick={() => close(true)}
                className="btn-ghost"
              >
                {s.ctaLabel}
              </a>
            )}
            <button
              type="button"
              onClick={next}
              className="btn-primary"
            >
              {isLast ? "Done" : "Next"} <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
