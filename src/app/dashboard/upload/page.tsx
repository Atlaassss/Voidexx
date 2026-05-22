"use client";

import { useEffect, useRef, useState } from "react";
import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Crosshair,
  Eye,
  FileImage,
  Layers,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Upload,
  XCircle,
} from "lucide-react";

type Phase = "idle" | "uploading" | "scanning" | "decoding" | "writing" | "done";

const PHASES: { id: Phase; label: string; ms: number }[] = [
  { id: "uploading", label: "Ingesting screenshot", ms: 700 },
  { id: "scanning", label: "OCR + structure scan", ms: 1100 },
  { id: "decoding", label: "Smart-money decode", ms: 1300 },
  { id: "writing", label: "Composing autopsy", ms: 900 },
];

export default function UploadPage() {
  const [file, setFile] = useState<{ name: string; size: number; url: string } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [phaseIndex, setPhaseIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragActive = useRef(false);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    if (phase === "idle" || phase === "done") return;
    const idx = PHASES.findIndex((p) => p.id === phase);
    setPhaseIndex(idx);
    const next = PHASES[idx + 1];
    const t = setTimeout(() => {
      if (next) setPhase(next.id);
      else setPhase("done");
    }, PHASES[idx].ms);
    return () => clearTimeout(t);
  }, [phase]);

  function handleFile(f: File) {
    const url = URL.createObjectURL(f);
    setFile({ name: f.name, size: f.size, url });
    setPhase("uploading");
  }

  function reset() {
    if (file?.url) URL.revokeObjectURL(file.url);
    setFile(null);
    setPhase("idle");
    setPhaseIndex(-1);
  }

  return (
    <>
      <Topbar
        title="Trade Autopsy"
        sub="Drop a chart screenshot · vision · OCR · structural decode"
      />

      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Upload column */}
          <div className="space-y-6 xl:col-span-5">
            <Panel title="Ingest" meta="step 01 / 04">
              {!file ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!dragActive.current) {
                      dragActive.current = true;
                      setDrag(true);
                    }
                  }}
                  onDragLeave={() => {
                    dragActive.current = false;
                    setDrag(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    dragActive.current = false;
                    setDrag(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleFile(f);
                  }}
                  onClick={() => inputRef.current?.click()}
                  className={`relative grid cursor-pointer place-items-center border border-dashed bg-void-100/40 px-6 py-16 text-center transition ${
                    drag
                      ? "border-signal-green bg-signal-green/[0.06]"
                      : "border-signal-cyan/50 hover:border-signal-cyan"
                  }`}
                >
                  <div className="absolute inset-0 bg-grid-fine opacity-30" />
                  <div className="relative">
                    <Upload
                      className={`mx-auto h-10 w-10 ${
                        drag ? "text-signal-green" : "text-signal-cyan"
                      }`}
                    />
                    <div className="mt-4 font-display text-3xl tracking-wide">
                      {drag ? "Release to ingest" : "Drop the loss"}
                    </div>
                    <div className="mt-2 font-mono text-[11px] uppercase tracking-widest2 text-void-700">
                      png · jpg · webp · 12MB max · or click to browse
                    </div>
                    <div className="mt-6 flex flex-wrap justify-center gap-1.5">
                      {["TradingView", "BingX", "Binance", "MT5", "Bybit", "Mobile"].map((p) => (
                        <span key={p} className="chip">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative overflow-hidden border border-void-300/70 bg-void-0/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.url}
                      alt={file.name}
                      className="h-[260px] w-full object-cover opacity-90"
                    />
                    {phase !== "done" && phase !== "idle" && (
                      <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-32 animate-scan bg-gradient-to-b from-transparent via-signal-cyan/30 to-transparent" />
                      </div>
                    )}
                    <div className="absolute left-2 top-2 chip border-signal-cyan/40 text-signal-cyan">
                      <FileImage className="h-3 w-3" />
                      {(file.size / 1024).toFixed(0)} KB
                    </div>
                    <div className="absolute right-2 top-2 chip">
                      {file.name.length > 28 ? file.name.slice(0, 25) + "…" : file.name}
                    </div>
                  </div>

                  <button
                    onClick={reset}
                    className="btn-ghost w-full justify-center"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Replace screenshot
                  </button>
                </div>
              )}
            </Panel>

            <Panel title="Pipeline" meta={phase === "done" ? "complete" : phase === "idle" ? "awaiting input" : "running"}>
              <ol className="space-y-3">
                {PHASES.map((p, i) => {
                  const active = phase === p.id;
                  const done =
                    phase === "done" || (phaseIndex >= 0 && i < phaseIndex);
                  return (
                    <li key={p.id} className="flex items-center gap-3">
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center border ${
                          done
                            ? "border-signal-green/60 text-signal-green"
                            : active
                              ? "border-signal-cyan/60 text-signal-cyan"
                              : "border-void-400 text-void-700"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : active ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <span className="font-mono text-[10px]">{i + 1}</span>
                        )}
                      </span>
                      <div className="flex-1">
                        <div
                          className={`font-mono text-[12px] uppercase tracking-widest2 ${
                            active
                              ? "text-signal-cyan"
                              : done
                                ? "text-signal-green"
                                : "text-void-700"
                          }`}
                        >
                          {p.label}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-void-600">
                        {done ? "OK" : active ? "..." : "—"}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          </div>

          {/* Report column */}
          <div className="xl:col-span-7">
            <Panel
              title="Autopsy report"
              meta={phase === "done" ? "verdict ready" : "awaiting verdict"}
            >
              <AnimatePresence mode="wait">
                {phase === "idle" && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid place-items-center py-16 text-center"
                  >
                    <Eye className="mb-4 h-10 w-10 text-void-600" />
                    <div className="font-display text-2xl tracking-wide text-void-700">
                      No trade in scope
                    </div>
                    <p className="mt-2 max-w-md text-sm text-void-700">
                      Upload a chart screenshot of a closed trade. The engine extracts
                      structure, smart-money intent, and writes a forensic verdict.
                    </p>
                  </motion.div>
                )}

                {phase !== "idle" && phase !== "done" && (
                  <motion.div
                    key="working"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3 py-6 font-mono text-[11px]"
                  >
                    <Working phase={phase} />
                  </motion.div>
                )}

                {phase === "done" && (
                  <motion.div
                    key="report"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Report />
                  </motion.div>
                )}
              </AnimatePresence>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}

function Working({ phase }: { phase: Phase }) {
  const lines: Record<Phase, string[]> = {
    idle: [],
    done: [],
    uploading: [
      "[ ok ] Stream opened · 1.4MB",
      "[ ok ] Hash 0x9a3f7c…",
      "[ ok ] Stored encrypted at rest",
    ],
    scanning: [
      "[ ok ] OCR pass · 14 candles · 1H · BTCUSDT",
      "[ ok ] Range high 67,612 · range low 66,820",
      "[ ok ] Detected BOS @ 67,420 · CHOCH @ 67,580",
      "[ ! ] Stop hunt above ASIA HIGH (67,612)",
      "[ ok ] Order block 67,290–67,355 (4H bullish)",
    ],
    decoding: [
      "[ dx ] Buy-side liquidity raid → reversal",
      "[ dx ] Premium of 4H dealing range",
      "[ dx ] Equal lows below = sell-side draw",
      "[ ! ] Inducement low ignored at 67,355",
      "[ dx ] Psychology: revenge entry · conf 0.81",
    ],
    writing: ["» Composing verdict ...", "» Drafting improvement plan ...", "» Linking lessons ..."],
  };
  return (
    <div className="space-y-1 leading-6 text-void-800">
      {lines[phase].map((l, i) => (
        <div key={i} className="animate-rise">
          <Pretty l={l} />
        </div>
      ))}
      <span className="caret text-signal-green" />
    </div>
  );
}

function Pretty({ l }: { l: string }) {
  const m = l.match(/^\[ (ok|!|dx) \]/);
  if (m) {
    const tag = m[1].toUpperCase();
    const rest = l.slice(m[0].length);
    const c =
      tag === "OK"
        ? "text-signal-green"
        : tag === "!"
          ? "text-signal-amber"
          : "text-signal-violet";
    return (
      <div>
        <span className={c}>[ {tag.padEnd(2, " ")} ]</span>
        <span>{rest}</span>
      </div>
    );
  }
  return <div className="text-signal-cyan">{l}</div>;
}

function Report() {
  return (
    <div className="space-y-6">
      {/* Verdict block */}
      <div className="grid grid-cols-1 gap-px bg-void-300/60 sm:grid-cols-3">
        <div className="bg-void-50/60 p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            Verdict
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-7xl leading-none text-signal-red">38</span>
            <span className="font-mono text-[11px] text-void-700">/ 100</span>
          </div>
          <div className="mt-3 text-sm text-void-800">
            Trapped on the wrong side of session liquidity. Setup was a textbook
            stop-hunt → reversal pattern.
          </div>
        </div>
        <div className="bg-void-50/60 p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            Result
          </div>
          <div className="mt-2 font-display text-3xl tracking-wide text-signal-red">−4.2R</div>
          <dl className="mt-3 space-y-1.5 font-mono text-[11px] text-void-800">
            <Row k="Entry" v="67,612.4" />
            <Row k="Stop" v="67,790.1" />
            <Row k="Target" v="66,840.0" />
            <Row k="R planned" v="1 : 4.3" />
          </dl>
        </div>
        <div className="bg-void-50/60 p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            Flags
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Flag tone="red">Revenge entry</Flag>
            <Flag tone="amber">Liquidity grab</Flag>
            <Flag tone="amber">Premium short</Flag>
            <Flag tone="violet">Trap fill</Flag>
            <Flag tone="amber">Late ignition</Flag>
          </div>
        </div>
      </div>

      {/* Mistake / Better setup */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Block
          icon={ShieldAlert}
          title="What you did"
          body="Opened a short directly into ASIA-session highs (67,612) without confirmation. The position filled on a liquidity sweep that immediately reversed back into the 4H bullish order block."
          tone="red"
        />
        <Block
          icon={Crosshair}
          title="What pros likely did"
          body="Waited for the sweep to print, then re-entered short on a 1H CHOCH below 67,500 with stop above the sweep. Risk capped at 1R, draw to 66,820 sell-side."
          tone="green"
        />
      </div>

      <Panel title="Improvement plan" meta="14-day cycle" bracketed={false}>
        <ul className="space-y-3 text-sm">
          <Plan tone="green">
            Wait for 1H CHOCH below the session high before shorting from premium.
          </Plan>
          <Plan tone="cyan">
            Re-entry zone: 67,355 (top of 4H OB) with stop above 67,612 sweep wick.
          </Plan>
          <Plan tone="amber">
            Reduce size 4× until discipline score crosses 70.
          </Plan>
          <Plan tone="violet">
            Block trading the 30 min after a stop-out for 14 days · revenge guard.
          </Plan>
        </ul>
      </Panel>

      {/* Layered concept tags */}
      <div className="border border-void-300/70 bg-void-100/40 p-4">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
          <Layers className="h-3 w-3" />
          Concepts engaged
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            "Liquidity grab",
            "ASIA high",
            "BOS",
            "CHOCH",
            "Order block",
            "FVG",
            "Premium / discount",
            "Inducement",
            "Stop hunt",
            "Sell-side draw",
          ].map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-void-300/60 pb-1">
      <dt className="text-void-700">{k}</dt>
      <dd className="text-void-900">{v}</dd>
    </div>
  );
}

function Flag({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "red" | "amber" | "violet" | "green";
}) {
  const map = {
    red: "border-signal-red/40 text-signal-red bg-signal-red/[0.08]",
    amber: "border-signal-amber/40 text-signal-amber bg-signal-amber/[0.08]",
    violet: "border-signal-violet/40 text-signal-violet bg-signal-violet/[0.08]",
    green: "border-signal-green/40 text-signal-green bg-signal-green/[0.08]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] uppercase tracking-widest2 ${map[tone]}`}
    >
      {children}
    </span>
  );
}

function Block({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  tone: "red" | "green";
}) {
  const map = {
    red: { bd: "border-signal-red/40", tx: "text-signal-red", bg: "bg-signal-red/[0.04]" },
    green: { bd: "border-signal-green/40", tx: "text-signal-green", bg: "bg-signal-green/[0.04]" },
  }[tone];
  return (
    <div className={`relative border ${map.bd} ${map.bg} p-5`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${map.tx}`} />
        <div className={`font-mono text-[10px] uppercase tracking-widest2 ${map.tx}`}>{title}</div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-void-800">{body}</p>
    </div>
  );
}

function Plan({
  tone,
  children,
}: {
  tone: "green" | "cyan" | "amber" | "violet";
  children: React.ReactNode;
}) {
  const map = {
    green: "border-signal-green/60",
    cyan: "border-signal-cyan/60",
    amber: "border-signal-amber/60",
    violet: "border-signal-violet/60",
  };
  return <li className={`border-l-2 pl-3 text-void-800 ${map[tone]}`}>{children}</li>;
}

// Suppress unused imports lint
void XCircle;
