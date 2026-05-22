/**
 * First pass — vision model reads the chart and emits a Structure JSON.
 *
 * If OPENAI_API_KEY is unset OR no image was resolvable from S3, we
 * fall back to a deterministic mock keyed off the uploadId hash so
 * demos look diverse instead of returning the same canned data.
 */

import { getOpenAI, microUsd } from "./openai";
import { VISION_SYSTEM } from "./prompts";
import type { StructureRead } from "./types";
import { mockStructure } from "./mock";
import { env } from "../env";

const VISION_MODEL = "gpt-4o";

export interface VisionResult {
  structure: StructureRead;
  inputTokens: number;
  outputTokens: number;
  microUsd: number;
  model: string;
  mock: boolean;
}

export async function runVisionPass(opts: {
  uploadId: string;
  imageDataUrl: string | null;
  hint?: { symbol?: string; timeframe?: string; direction?: "LONG" | "SHORT" };
  signal?: AbortSignal;
}): Promise<VisionResult> {
  if (!env.openai.enabled || !opts.imageDataUrl) {
    const structure = mockStructure(opts.uploadId, opts.hint);
    return {
      structure,
      inputTokens: 0,
      outputTokens: 0,
      microUsd: 0,
      model: "voidexx-vision-mock-1",
      mock: true,
    };
  }

  const openai = await getOpenAI();
  const userText = buildVisionUserText(opts.hint);

  const completion = await openai.chat.completions.create(
    {
      model: VISION_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        { role: "system", content: VISION_SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: opts.imageDataUrl, detail: "high" } },
          ],
        },
      ],
    },
    { signal: opts.signal },
  );

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const structure = parseStructure(raw);
  const usage = completion.usage;
  const inTok = usage?.prompt_tokens ?? 0;
  const outTok = usage?.completion_tokens ?? 0;

  return {
    structure,
    inputTokens: inTok,
    outputTokens: outTok,
    microUsd: microUsd("gpt-4o", inTok, outTok),
    model: VISION_MODEL,
    mock: false,
  };
}

function buildVisionUserText(hint?: {
  symbol?: string;
  timeframe?: string;
  direction?: "LONG" | "SHORT";
}) {
  let s = "Read this chart and emit the Structure JSON described in your system prompt.";
  if (hint?.symbol) s += `\nUser context — symbol: ${hint.symbol}.`;
  if (hint?.timeframe) s += ` Timeframe: ${hint.timeframe}.`;
  if (hint?.direction) s += ` They claim direction: ${hint.direction}.`;
  s += "\nReturn JSON only.";
  return s;
}

/** Robustly parse the model's JSON output, defaulting fields if missing. */
function parseStructure(raw: string): StructureRead {
  let obj: Record<string, unknown> = {};
  try {
    obj = JSON.parse(raw);
  } catch {
    obj = {};
  }
  const r = obj as Record<string, unknown>;
  const range = isObj(r.range)
    ? { high: numOr(r.range.high, 0), low: numOr(r.range.low, 0) }
    : null;
  return {
    symbol: stringOr(r.symbol, null),
    timeframe: stringOr(r.timeframe, null),
    direction: r.direction === "LONG" || r.direction === "SHORT" ? r.direction : null,
    range,
    candles_visible: numOr(r.candles_visible, 0),
    key_zones: Array.isArray(r.key_zones)
      ? (r.key_zones as Array<Record<string, unknown>>).slice(0, 6).map((z) => ({
          type: (z.type as StructureRead["key_zones"][number]["type"]) ?? "LIQUIDITY",
          tf: stringOr(z.tf, null),
          side: z.side === "BULL" || z.side === "BEAR" ? z.side : null,
          low: numOrNull(z.low),
          high: numOrNull(z.high),
          level: numOrNull(z.level),
          label: stringOr(z.label, null),
        }))
      : [],
    structure_events: Array.isArray(r.structure_events)
      ? (r.structure_events as Array<Record<string, unknown>>).slice(0, 8).map((e) => ({
          kind: (e.kind as StructureRead["structure_events"][number]["kind"]) ?? "BOS",
          level: numOrNull(e.level),
          side: e.side === "BULL" || e.side === "BEAR" ? e.side : null,
        }))
      : [],
    trade_marks: isObj(r.trade_marks)
      ? {
          entry: numOrNull(r.trade_marks.entry),
          stop: numOrNull(r.trade_marks.stop),
          target: numOrNull(r.trade_marks.target),
        }
      : { entry: null, stop: null, target: null },
    session_context:
      r.session_context === "ASIA" ||
      r.session_context === "LONDON" ||
      r.session_context === "NY" ||
      r.session_context === "OVERLAP"
        ? r.session_context
        : null,
    confidence: clamp01(numOr(r.confidence, 0.5)),
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function stringOr<T>(v: unknown, fallback: T): string | T {
  return typeof v === "string" ? v : fallback;
}
function numOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
