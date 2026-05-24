"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const QA = [
  {
    q: "Does VOIDEXX actually read my charts?",
    a: "Yes. We run a vision model on your screenshot to identify candles, structure breaks, liquidity pools and key zones. OCR pulls timeframe and symbol when visible. The output is a structured object — not vibes.",
  },
  {
    q: "Will it work with TradingView, MT5, BingX, Binance screenshots?",
    a: "All of the above. Mobile screenshots too. The cleaner the chart, the cleaner the read — but it tolerates noise.",
  },
  {
    q: "Is my data private?",
    a: "Uploads are encrypted in transit and at rest. We don't sell data. You can purge any trade or your entire account at any time.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts, no clawbacks. Cancel and keep access until the end of the period.",
  },
  {
    q: "Will VOIDEXX trade for me?",
    a: "No. VOIDEXX is intentionally not an auto-trading bot. The engine reads your charts, scores your discipline, and writes the post-mortem — you stay in the chair for every entry.",
  },
  {
    q: "Do I need to know SMC / ICT to use it?",
    a: "No. Reports are written in plain English with the underlying concepts linked to short lessons in the Learn module.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative border-b border-void-300/60 py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest3 text-signal-cyan">
          <span className="grid h-5 w-5 place-items-center border border-signal-cyan/60">06</span>
          <span>FAQ</span>
          <span className="h-px flex-1 bg-void-300/70" />
        </div>

        <h2 className="display-crush mt-4 text-5xl sm:text-7xl">Things you'd ask.</h2>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <p className="text-void-700">
              Couldn't find an answer? Hit{" "}
              <a className="text-signal-cyan underline-offset-2 hover:underline" href="mailto:hi@voidexx.io">
                hi@voidexx.io
              </a>
              . We reply.
            </p>
          </div>
          <div className="mt-8 divide-y divide-void-300/70 border-y border-void-300/70 lg:col-span-8 lg:mt-0">
            {QA.map((it, i) => {
              const isOpen = open === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left"
                  >
                    <span className="font-display text-xl tracking-wide sm:text-2xl">{it.q}</span>
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center border border-void-400 transition ${
                        isOpen ? "rotate-45 border-signal-green text-signal-green" : "text-void-700"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                  <div
                    className={`grid overflow-hidden transition-all ${
                      isOpen ? "grid-rows-[1fr] pb-6" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden text-void-700">{it.a}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
