"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import Link from "next/link";

/**
 * Sticky left ad rail. Visible on free-tier visitors at lg+ screens only.
 * Pass `paid` to remove. Includes a manual collapse for users who pay later
 * within session, and elegantly hides itself below lg breakpoint.
 *
 * In production, replace AdSlot bodies with Google Ad Manager / AdSense
 * partial loaded asynchronously, or native ad partials.
 */
export function AdRail({ paid = false }: { paid?: boolean }) {
  const [hidden, setHidden] = useState(false);
  if (paid || hidden) return null;

  return (
    <aside className="pointer-events-none fixed left-0 top-20 z-40 hidden h-[calc(100vh-6rem)] w-[200px] flex-col gap-4 px-3 lg:flex">
      <div className="pointer-events-auto cell brackets noise relative flex flex-col">
        <span className="b1" />
        <span className="b2" />
        <div className="cell-header">
          <span>Sponsored</span>
          <button onClick={() => setHidden(true)} aria-label="Hide ads" className="hover:text-signal-red">
            <X className="h-3 w-3" />
          </button>
        </div>
        <AdSlot title="Tradenomics" body="Real-time order-flow heatmaps. Free trial." cta="Try" />
      </div>

      <div className="pointer-events-auto cell brackets relative flex flex-col">
        <span className="b1" />
        <span className="b2" />
        <div className="cell-header">
          <span>Sponsored</span>
          <span className="text-void-600">02</span>
        </div>
        <AdSlot title="PropFlow" body="Funded accounts up to $400k. Skip evaluation." cta="Apply" />
      </div>

      <div className="pointer-events-auto mt-auto border border-signal-green/40 bg-signal-green/[0.05] p-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 text-signal-green">
          <Sparkles className="h-3 w-3" />
          Hate ads?
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-void-800">
          Operator removes them — and unlocks the full autopsy engine.
        </p>
        <Link
          href="/dashboard"
          className="mt-3 block bg-signal-green px-2 py-1.5 text-center font-mono text-[10px] uppercase tracking-widest2 text-void-0"
        >
          Upgrade →
        </Link>
      </div>
    </aside>
  );
}

function AdSlot({ title, body, cta }: { title: string; body: string; cta: string }) {
  return (
    <div className="p-3">
      <div className="font-display text-lg leading-tight tracking-wide">{title}</div>
      <p className="mt-1 text-[11px] leading-relaxed text-void-700">{body}</p>
      <button className="mt-3 border border-signal-cyan/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-signal-cyan hover:bg-signal-cyan hover:text-void-0">
        {cta} →
      </button>
    </div>
  );
}
