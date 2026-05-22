"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ScanLine, FileSearch, BookOpenCheck } from "lucide-react";

const STEPS = [
  { id: 0, label: "Drop screenshot", icon: Upload, sub: "PNG · JPG · PDF · 12MB" },
  { id: 1, label: "OCR + structure scan", icon: ScanLine, sub: "Detect candles, BOS/CHOCH, FVG, OB" },
  { id: 2, label: "Smart-money decode", icon: FileSearch, sub: "Liquidity, manipulation, intent" },
  { id: 3, label: "Autopsy report", icon: BookOpenCheck, sub: "Verdict · score · improvement plan" },
];

export function LiveDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="demo" className="relative border-b border-void-300/60 py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <SectionLabel index="02" label="Pipeline" />
        <h2 className="display-crush mt-4 max-w-3xl text-5xl sm:text-7xl">
          From a single<br /> screenshot to a<br />
          <span className="text-signal-cyan">forensic verdict.</span>
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* steps rail */}
          <ol className="lg:col-span-5">
            {STEPS.map((s) => {
              const active = s.id === step;
              const passed = s.id < step;
              const Icon = s.icon;
              return (
                <li
                  key={s.id}
                  className={`relative flex items-start gap-4 border-l py-5 pl-6 transition ${
                    active
                      ? "border-signal-green text-void-900"
                      : passed
                        ? "border-signal-cyan/50 text-void-800"
                        : "border-void-300 text-void-700"
                  }`}
                >
                  <span
                    className={`absolute -left-[7px] top-7 h-3 w-3 border ${
                      active
                        ? "border-signal-green bg-signal-green"
                        : passed
                          ? "border-signal-cyan bg-void-0"
                          : "border-void-400 bg-void-0"
                    }`}
                  />
                  <Icon className="mt-1 h-5 w-5" />
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                      Step 0{s.id + 1}
                    </div>
                    <div className="font-display text-2xl tracking-wide">{s.label}</div>
                    <div className="mt-1 text-sm text-void-700">{s.sub}</div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* preview viewport */}
          <div className="lg:col-span-7">
            <div className="brackets cell h-[460px] overflow-hidden">
              <span className="b1" />
              <span className="b2" />
              <div className="cell-header">
                <span>VOIDEXX // viewport</span>
                <span>{`step 0${step + 1} / 04`}</span>
              </div>
              <div className="relative h-[calc(100%-33px)] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0"
                  >
                    {step === 0 && <DropPreview />}
                    {step === 1 && <ScanPreview />}
                    {step === 2 && <DecodePreview />}
                    {step === 3 && <ReportPreview />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionLabel({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest3 text-signal-cyan">
      <span className="grid h-5 w-5 place-items-center border border-signal-cyan/60">{index}</span>
      <span>{label}</span>
      <span className="h-px flex-1 bg-void-300/70" />
    </div>
  );
}

function DropPreview() {
  return (
    <div className="grid h-full place-items-center bg-void-50/30 bg-grid-fine">
      <div className="border border-dashed border-signal-cyan/60 bg-void-100/60 p-10 text-center">
        <Upload className="mx-auto h-10 w-10 text-signal-cyan" />
        <div className="mt-4 font-display text-2xl tracking-wide">Drop the loss</div>
        <div className="mt-1 font-mono text-[11px] text-void-700">tradingview.png · 1.4mb</div>
      </div>
    </div>
  );
}

function ScanPreview() {
  // Fake candle chart with a sliding scan line
  const candles = [
    { o: 60, c: 80, h: 90, l: 50, up: true },
    { o: 80, c: 70, h: 95, l: 60, up: false },
    { o: 70, c: 92, h: 98, l: 65, up: true },
    { o: 92, c: 110, h: 120, l: 88, up: true },
    { o: 110, c: 98, h: 115, l: 90, up: false },
    { o: 98, c: 130, h: 145, l: 95, up: true },
    { o: 130, c: 118, h: 140, l: 110, up: false },
    { o: 118, c: 100, h: 122, l: 90, up: false },
    { o: 100, c: 75, h: 105, l: 60, up: false },
    { o: 75, c: 90, h: 95, l: 70, up: true },
    { o: 90, c: 60, h: 95, l: 50, up: false },
    { o: 60, c: 45, h: 65, l: 30, up: false },
  ];
  return (
    <div className="relative h-full bg-void-50/30 p-6">
      <div className="absolute inset-0 bg-grid-fine opacity-50" />
      <div className="absolute inset-x-0 top-0 h-full overflow-hidden">
        <div className="absolute inset-x-0 h-40 animate-scan bg-gradient-to-b from-transparent via-signal-cyan/15 to-transparent" />
      </div>

      <div className="relative flex h-full items-end justify-around gap-2">
        {candles.map((c, i) => (
          <div key={i} className="flex flex-col items-center" style={{ height: "100%" }}>
            <div
              className="w-px bg-void-700"
              style={{ height: `${(c.h - c.l) * 1.2}px`, marginBottom: -1 }}
            />
            <div
              className={`w-3 ${c.up ? "bg-signal-green" : "bg-signal-red"}`}
              style={{ height: `${Math.abs(c.c - c.o) * 1.2 || 4}px` }}
            />
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2 text-void-700">
        <span>BTC / USDT · 1H</span>
        <span className="text-signal-cyan">[ scanning structure · 64% ]</span>
      </div>
    </div>
  );
}

function DecodePreview() {
  const reads = [
    { x: "Liquidity above 67,612", c: "Asia high · sweep target" },
    { x: "Order block 67,290–67,355", c: "4H bullish · unmitigated" },
    { x: "FVG 67,420 → 67,510", c: "Premium of dealing range" },
    { x: "Equal lows 66,820", c: "Sell-side liquidity (target)" },
  ];
  return (
    <div className="grid h-full grid-cols-2 gap-px bg-void-300/60 p-px">
      {reads.map((r, i) => (
        <div key={i} className="bg-void-50/60 p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest2 text-signal-cyan">
            Read {String(i + 1).padStart(2, "0")}
          </div>
          <div className="mt-2 font-display text-xl tracking-wide">{r.x}</div>
          <div className="mt-1 text-sm text-void-700">{r.c}</div>
        </div>
      ))}
    </div>
  );
}

function ReportPreview() {
  return (
    <div className="grid h-full grid-cols-3 gap-px bg-void-300/60 p-px">
      <div className="col-span-1 bg-void-50/60 p-5">
        <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">Verdict</div>
        <div className="mt-2 font-display text-7xl leading-none text-signal-red">38</div>
        <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">/ 100</div>
        <div className="mt-4 text-sm text-void-800">
          Trapped on the wrong side of session liquidity. Setup was a textbook stop-hunt
          → reversal pattern.
        </div>
      </div>
      <div className="col-span-2 bg-void-50/60 p-5">
        <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
          Improvement plan
        </div>
        <ul className="mt-3 space-y-2 text-sm text-void-800">
          <li className="border-l-2 border-signal-green/60 pl-3">
            Wait for 1H CHOCH below the session high before shorting.
          </li>
          <li className="border-l-2 border-signal-cyan/60 pl-3">
            Re-entry: 67,355 (top of 4H OB) with stop above 67,612 sweep.
          </li>
          <li className="border-l-2 border-signal-amber/60 pl-3">
            Reduce size 4× until discipline score crosses 70.
          </li>
          <li className="border-l-2 border-signal-violet/60 pl-3">
            Block trading in the 30 min after a stop-out for 14 days (revenge guard).
          </li>
        </ul>
      </div>
    </div>
  );
}
