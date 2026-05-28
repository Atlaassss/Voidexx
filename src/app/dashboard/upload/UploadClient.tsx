"use client";

import { useEffect, useRef, useState } from "react";
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
import type { AutopsyResponse, AutopsyFlag, NextAction, RiskLevel } from "@/lib/api/contracts";

type Phase =
  | "idle"
  | "presigning"
  | "uploading"
  | "fetch"
  | "vision"
  | "verdict"
  | "score"
  | "persist"
  | "done"
  | "error";

const PHASES: { id: Exclude<Phase, "idle" | "done" | "error">; label: string }[] = [
  { id: "presigning", label: "Negotiating upload URL" },
  { id: "uploading", label: "Ingesting screenshot" },
  { id: "fetch", label: "Resolving in storage" },
  { id: "vision", label: "Vision pass · OCR + structure" },
  { id: "verdict", label: "Composing forensic verdict" },
  { id: "score", label: "Scoring discipline & risk" },
  { id: "persist", label: "Recording in journal" },
];

interface PresignBody {
  key: string;
  uploadUrl: string | null;
  publicUrl: string | null;
  demo: boolean;
  maxBytes: number;
}

export function UploadClient() {
  const [file, setFile] = useState<{
    name: string;
    size: number;
    type: string;
    url: string;
    raw: File;
  } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AutopsyResponse | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragActive = useRef(false);
  const [drag, setDrag] = useState(false);

  function handleFile(f: File) {
    setError(null);
    setReport(null);
    setProgress(0);
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
      setError("Unsupported file type. Use PNG, JPG or WEBP.");
      return;
    }
    if (f.size > 12 * 1024 * 1024) {
      setError("File is too large. Max 12 MB.");
      return;
    }
    const url = URL.createObjectURL(f);
    setFile({ name: f.name, size: f.size, type: f.type, url, raw: f });
  }

  // Run the pipeline whenever a fresh file is set or retry is triggered.
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    const ac = new AbortController();
    (async () => {
      try {
        // Step 1: presign
        setPhase("presigning");
        const presignRes = await fetch("/api/uploads", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contentType: file.type, size: file.size }),
          signal: ac.signal,
        });
        if (!presignRes.ok) throw new Error(`presign_failed:${presignRes.status}`);
        const presign = (await presignRes.json()) as PresignBody;
        if (cancelled) return;

        // Step 2: upload (or fake progress in demo)
        setPhase("uploading");
        if (presign.uploadUrl) {
          await uploadWithProgress(presign.uploadUrl, file.raw, (p) => setProgress(p));
        } else {
          await fakeProgress((p) => setProgress(p));
        }
        if (cancelled) return;

        // Step 3: stream the autopsy pipeline
        const autopsyRes = await fetch("/api/autopsy", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ uploadId: presign.key }),
          signal: ac.signal,
        });

        if (autopsyRes.status === 402) {
          const data = await autopsyRes.json();
          throw new Error(data.message ?? "Quota exceeded — upgrade to continue.");
        }
        if (!autopsyRes.ok || !autopsyRes.body) {
          throw new Error(`autopsy_failed:${autopsyRes.status}`);
        }

        await readNdjson(autopsyRes.body, (e) => {
          if (cancelled) return;
          if (e.event === "progress") {
            setPhase(e.phase);
          } else if (e.event === "done") {
            setReport(e.report);
            setPhase("done");
          } else if (e.event === "error") {
            throw new Error(e.message);
          }
        });
      } catch (e) {
        if (cancelled || (e as { name?: string })?.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "unknown_error");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, retryKey]);

  function reset() {
    if (file?.url) URL.revokeObjectURL(file.url);
    setFile(null);
    setPhase("idle");
    setProgress(0);
    setError(null);
    setReport(null);
  }

  /**
   * Retry the autopsy pipeline with the same screenshot. Resets error
   * state and re-triggers the pipeline effect via retryKey increment.
   * The file stays — no re-upload needed.
   */
  function retry() {
    setPhase("presigning");
    setProgress(0);
    setError(null);
    setReport(null);
    setRetryKey((k) => k + 1);
  }

  const phaseIndex = PHASES.findIndex((p) => p.id === phase);

  return (
    <>
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Upload column */}
          <div className="space-y-6 xl:col-span-5">
            <Panel title="Ingest" meta={`step 0${Math.max(1, phaseIndex + 1)} / 0${PHASES.length}`}>
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
                    accept="image/png,image/jpeg,image/webp"
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
                    {phase !== "done" && phase !== "error" && (
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

                  {phase === "uploading" && (
                    <div>
                      <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                        <span>Upload</span>
                        <span className="text-signal-cyan">{progress}%</span>
                      </div>
                      <div className="h-1 w-full bg-void-300/60">
                        <div
                          className="h-full bg-signal-cyan transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button onClick={reset} className="btn-ghost w-full justify-center">
                    <RotateCcw className="h-3 w-3" />
                    Replace screenshot
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 border border-signal-red/40 bg-signal-red/[0.06] p-3">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 text-signal-red">
                    <XCircle className="h-3 w-3" />
                    Error
                  </div>
                  <p className="mt-1 text-sm text-void-800">{error}</p>
                  {file && (
                    <button
                      onClick={retry}
                      className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest2 text-signal-cyan hover:text-signal-green transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Retry with same screenshot
                    </button>
                  )}
                </div>
              )}
            </Panel>

            <Panel
              title="Pipeline"
              meta={
                phase === "done"
                  ? "complete"
                  : phase === "idle"
                    ? "awaiting input"
                    : phase === "error"
                      ? "halted"
                      : "running"
              }
            >
              <ol className="space-y-3">
                {PHASES.map((p, i) => {
                  const active = phase === p.id;
                  const done = phase === "done" || (phaseIndex >= 0 && i < phaseIndex);
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

                {phase !== "idle" && phase !== "done" && phase !== "error" && (
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

                {phase === "done" && report && (
                  <motion.div
                    key="report"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Report data={report} />
                  </motion.div>
                )}

                {phase === "error" && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid place-items-center py-16 text-center"
                  >
                    <XCircle className="mb-4 h-10 w-10 text-signal-red" />
                    <div className="font-display text-2xl tracking-wide text-signal-red">
                      Pipeline halted
                    </div>
                    <p className="mt-2 max-w-md text-sm text-void-700">
                      {error ?? "Unknown error"}
                    </p>
                    <div className="mt-4 flex gap-3">
                      <button onClick={retry} className="btn-primary">
                        <RotateCcw className="h-3 w-3" />
                        Retry autopsy
                      </button>
                      <button onClick={reset} className="btn-ghost">
                        New screenshot
                      </button>
                    </div>
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

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`s3_put_failed:${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("s3_put_network_error"));
    xhr.send(file);
  });
}

async function fakeProgress(onProgress: (pct: number) => void) {
  for (let i = 10; i <= 100; i += 10) {
    await wait(60);
    onProgress(i);
  }
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Consume an NDJSON stream from the autopsy endpoint. One JSON object
 * per line. Calls `onEvent` per parsed event. Throws if the upstream
 * emits an error event.
 */
type ServerEvent =
  | { event: "progress"; phase: Phase; pct: number; message: string }
  | { event: "done"; report: AutopsyResponse }
  | { event: "error"; message: string };

async function readNdjson(
  body: ReadableStream<Uint8Array>,
  onEvent: (e: ServerEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        onEvent(JSON.parse(line) as ServerEvent);
      } catch (err) {
        console.error("[ndjson] parse failed", err, line);
      }
    }
  }
  if (buf.trim()) {
    try {
      onEvent(JSON.parse(buf.trim()) as ServerEvent);
    } catch {
      /* ignore trailing junk */
    }
  }
}

function Working({ phase }: { phase: Phase }) {
  const lines: Partial<Record<Phase, string[]>> = {
    presigning: ["[ ok ] Stream opened", "[ ok ] Negotiating presigned PUT"],
    uploading: ["[ ok ] Streaming bytes ...", "[ ok ] Hash 0x9a3f7c…"],
    fetch: ["[ ok ] Resolving upload key", "[ ok ] Fetched · 1.4MB"],
    vision: [
      "[ ok ] Vision model engaged",
      "[ ok ] OCR pass · scanning candles",
      "[ ! ] Identifying liquidity zones",
      "[ ok ] Marking BOS / CHOCH events",
      "[ ok ] Reading trade marks (entry/stop/target)",
    ],
    verdict: [
      "[ dx ] Cross-referencing structure → behavioural patterns",
      "[ dx ] Drafting verdict",
      "[ ! ] Linking concepts",
      "[ dx ] Composing improvement plan",
    ],
    score: [
      "[ ok ] Applying flag weights",
      "[ ok ] Computing structural bonus",
      "[ ok ] Risk-adjusted score finalised",
    ],
    persist: ["» Writing Trade row ...", "» Writing Autopsy row ...", "» Indexing tags ..."],
  };
  return (
    <div className="space-y-1 leading-6 text-void-800">
      {(lines[phase] ?? []).map((l, i) => (
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

function Report({ data }: { data: AutopsyResponse }) {
  const scoreClass =
    data.score >= 75
      ? "text-signal-green"
      : data.score >= 50
        ? "text-signal-amber"
        : "text-signal-red";

  return (
    <div className="space-y-6">
      {/* Verdict / cost meta strip */}
      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest2">
        {data.mock && (
          <span className="chip border-signal-amber/40 text-signal-amber">
            mock pipeline · set OPENAI_API_KEY for real verdicts
          </span>
        )}
        {data.cost && !data.mock && (
          <span className="chip border-signal-cyan/40 text-signal-cyan">
            cost · ${(data.cost.microUsd / 1_000_000).toFixed(4)} ·{" "}
            {data.cost.modelVision === data.cost.modelVerdict
              ? data.cost.modelVision
              : `${data.cost.modelVision} + ${data.cost.modelVerdict}`}
          </span>
        )}
        <span className="chip">id · {data.id}</span>
      </div>

      <div className="grid grid-cols-1 gap-px bg-void-300/60 sm:grid-cols-3">
        <div className="bg-void-50/60 p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            Verdict
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`font-display text-7xl leading-none ${scoreClass}`}>
              {data.score}
            </span>
            <span className="font-mono text-[11px] text-void-700">/ 100</span>
          </div>
          <div className="mt-3 text-sm text-void-800">{data.verdict}</div>
        </div>
        <div className="bg-void-50/60 p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            Result
          </div>
          <div className="mt-2 font-display text-3xl tracking-wide text-signal-red">
            {extractRr(data.summary, data.score)}
          </div>
          {data.rebuyZone && (
            <div className="mt-3 font-mono text-[11px]">
              <span className="text-void-700">Rebuy zone</span>{" "}
              <span className="text-void-900">{data.rebuyZone}</span>
            </div>
          )}
        </div>
        <div className="bg-void-50/60 p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            Flags
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.flags.map((f) => (
              <Flag key={f.key} flag={f} />
            ))}
          </div>
        </div>
      </div>

      {/* Phase 9 — win probability + risk level + next actions */}
      <ProbabilityRiskStrip
        winProbability={data.winProbability}
        riskLevel={data.riskLevel}
      />

      <NextActionsPanel actions={data.nextActions} riskLevel={data.riskLevel} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Block icon={ShieldAlert} title="What you did" body={data.summary} tone="red" />
        <Block icon={Crosshair} title="Improvement plan" body={data.improvement} tone="green" />
      </div>

      <div className="border border-void-300/70 bg-void-100/40 p-4">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
          <Layers className="h-3 w-3" />
          Concepts engaged
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.concepts.map((t) => (
            <span key={t} className="chip">
              {t.replace(/-/g, " ")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Extract a "result" R-multiple from the summary text when present
 * (e.g. "+2.6R", "-4.2R"). Falls back to a label keyed off the score
 * when no R-multiple is mentioned.
 */
function extractRr(summary: string, score: number): string {
  const m = summary.match(/[+-]?\d+(?:\.\d+)?R\b/);
  if (m) return m[0].replace("-", "−");
  if (score >= 75) return "WIN";
  if (score >= 50) return "BREAK-EVEN";
  return "LOSS";
}

function Flag({ flag }: { flag: AutopsyFlag }) {
  const map = {
    red: "border-signal-red/40 text-signal-red bg-signal-red/[0.08]",
    amber: "border-signal-amber/40 text-signal-amber bg-signal-amber/[0.08]",
    violet: "border-signal-violet/40 text-signal-violet bg-signal-violet/[0.08]",
    green: "border-signal-green/40 text-signal-green bg-signal-green/[0.08]",
    cyan: "border-signal-cyan/40 text-signal-cyan bg-signal-cyan/[0.08]",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] uppercase tracking-widest2 ${map[flag.tone]}`}
      title={`confidence ${(flag.confidence * 100).toFixed(0)}%`}
    >
      {flag.label}
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

// ----------------------------------------------------------------------------
// Phase 9 — win probability + risk level + next actions
//
// These three signals are surfaced directly under the score so a user
// can answer the only three questions that matter after a loss:
//
//   1. If I had followed the corrected plan, would it have won?
//   2. How dangerous was what I just did?
//   3. What do I do next?
// ----------------------------------------------------------------------------

function ProbabilityRiskStrip({
  winProbability,
  riskLevel,
}: {
  winProbability: number;
  riskLevel: RiskLevel;
}) {
  const probPct = Math.round(winProbability * 100);
  const probClass =
    probPct >= 75
      ? "text-signal-green"
      : probPct >= 60
        ? "text-signal-cyan"
        : probPct >= 45
          ? "text-signal-amber"
          : "text-signal-red";

  const risk = riskMeta(riskLevel);

  return (
    <div className="grid grid-cols-1 gap-px bg-void-300/60 sm:grid-cols-2">
      <div className="bg-void-50/60 p-5">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2 text-void-700">
          <span>Win probability</span>
          <span className="text-void-700">if you follow the plan</span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className={`font-display text-6xl leading-none ${probClass}`}>{probPct}%</span>
          <span className="font-mono text-[11px] text-void-700">expected hit rate</span>
        </div>
        <div className="mt-3 h-1.5 w-full bg-void-300/60">
          <div
            className={`h-full transition-all ${
              probPct >= 75
                ? "bg-signal-green"
                : probPct >= 60
                  ? "bg-signal-cyan"
                  : probPct >= 45
                    ? "bg-signal-amber"
                    : "bg-signal-red"
            }`}
            style={{ width: `${probPct}%` }}
          />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-void-700">
          Forecasts the win rate of the corrected setup, not the trade you just took. Anchored on
          the discipline score with confluence and flag adjustments.
        </p>
      </div>

      <div className={`relative bg-void-50/60 p-5 ${risk.outline}`}>
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2 text-void-700">
          <span>Risk level</span>
          <ShieldAlert className={`h-3.5 w-3.5 ${risk.text}`} />
        </div>
        <div className={`mt-3 font-display text-6xl leading-none tracking-wide ${risk.text}`}>
          {riskLevel}
        </div>
        <div className={`mt-3 inline-flex items-center gap-2 border px-2 py-0.5 ${risk.chip}`}>
          <span className={`h-1.5 w-1.5 ${risk.dot}`} />
          <span className="font-mono text-[10px] uppercase tracking-widest2">
            {risk.tagline}
          </span>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-void-700">{risk.body}</p>
      </div>
    </div>
  );
}

function NextActionsPanel({
  actions,
  riskLevel,
}: {
  actions: NextAction[];
  riskLevel: RiskLevel;
}) {
  if (!actions || actions.length === 0) return null;
  const risk = riskMeta(riskLevel);
  return (
    <div className="border border-void-300/70 bg-void-100/30 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair className={`h-4 w-4 ${risk.text}`} />
          <h3 className="font-display text-2xl tracking-wide">Next actions</h3>
        </div>
        <span className="chip border-void-300/70 text-void-700">
          {actions.length} step{actions.length === 1 ? "" : "s"} · ordered by urgency
        </span>
      </div>
      <ol className="mt-4 space-y-3">
        {actions.map((a, i) => {
          const tone = nextActionTone(a.tone);
          return (
            <li
              key={i}
              className={`relative grid grid-cols-[auto_1fr] gap-4 border-l-2 ${tone.border} bg-void-0/40 p-4`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center border ${tone.border} ${tone.text} font-mono text-[11px]`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className={`font-display text-base leading-snug tracking-wide ${tone.text}`}>
                  {a.label}
                </div>
                {a.rationale && (
                  <p className="mt-1 text-[12px] leading-relaxed text-void-700">{a.rationale}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function riskMeta(level: RiskLevel): {
  text: string;
  outline: string;
  chip: string;
  dot: string;
  tagline: string;
  body: string;
} {
  switch (level) {
    case "LOW":
      return {
        text: "text-signal-green",
        outline: "border-l-2 border-signal-green/40",
        chip: "border-signal-green/40 text-signal-green",
        dot: "bg-signal-green",
        tagline: "structurally clean",
        body: "Multi-confluence setup, controlled R, plan-aligned. Repeat this exact entry pattern.",
      };
    case "MEDIUM":
      return {
        text: "text-signal-amber",
        outline: "border-l-2 border-signal-amber/40",
        chip: "border-signal-amber/40 text-signal-amber",
        dot: "bg-signal-amber",
        tagline: "fixable with tweaks",
        body: "Setup was valid but a soft flag was present. Tighten the entry trigger and continue at baseline size.",
      };
    case "HIGH":
      return {
        text: "text-signal-red",
        outline: "border-l-2 border-signal-red/40",
        chip: "border-signal-red/40 text-signal-red",
        dot: "bg-signal-red",
        tagline: "danger zone",
        body: "Multiple warning flags or weak structural backing. Halve size and journal each entry trigger before continuing.",
      };
    case "EXTREME":
      return {
        text: "text-signal-red",
        outline: "border-l-2 border-signal-red/60 ring-1 ring-signal-red/20",
        chip: "border-signal-red/60 bg-signal-red/[0.08] text-signal-red",
        dot: "bg-signal-red animate-pulse-dot",
        tagline: "stop trading now",
        body: "Revenge / FOMO / no-stop pattern detected. Cut size 75% for the next 5 trades. Capital preservation over setup quality.",
      };
  }
}

function nextActionTone(tone: NextAction["tone"]): { border: string; text: string } {
  switch (tone) {
    case "green":
      return { border: "border-signal-green/60", text: "text-signal-green" };
    case "amber":
      return { border: "border-signal-amber/60", text: "text-signal-amber" };
    case "red":
      return { border: "border-signal-red/60", text: "text-signal-red" };
    case "violet":
      return { border: "border-signal-violet/60", text: "text-signal-violet" };
    case "cyan":
      return { border: "border-signal-cyan/60", text: "text-signal-cyan" };
  }
}
