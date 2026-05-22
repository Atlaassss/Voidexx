/**
 * Second pass — verdict narrative model composes the post-mortem from
 * a Structure JSON. Pure text completion (no vision).
 *
 * Falls back to a mock keyed off the uploadId when OPENAI is unset.
 */

import { getOpenAI, microUsd } from "./openai";
import { VERDICT_SYSTEM, buildVerdictUserPrompt } from "./prompts";
import type { StructureRead, VerdictRead } from "./types";
import { mockVerdict } from "./mock";
import { env } from "../env";
import type { AutopsyFlag } from "../api/contracts";

const VERDICT_MODEL = "gpt-4o";
const VALID_TONES = new Set(["red", "amber", "violet", "green", "cyan"]);

export interface VerdictResult {
  verdict: VerdictRead;
  inputTokens: number;
  outputTokens: number;
  microUsd: number;
  model: string;
  mock: boolean;
}

export async function runVerdictPass(opts: {
  uploadId: string;
  structure: StructureRead;
  notes?: string;
  signal?: AbortSignal;
}): Promise<VerdictResult> {
  if (!env.openai.enabled) {
    const verdict = mockVerdict(opts.uploadId, opts.structure);
    return {
      verdict,
      inputTokens: 0,
      outputTokens: 0,
      microUsd: 0,
      model: "voidexx-verdict-mock-1",
      mock: true,
    };
  }

  const openai = await getOpenAI();
  const structureJson = JSON.stringify(opts.structure);
  const completion = await openai.chat.completions.create(
    {
      model: VERDICT_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 700,
      messages: [
        { role: "system", content: VERDICT_SYSTEM },
        { role: "user", content: buildVerdictUserPrompt(structureJson, opts.notes) },
      ],
    },
    { signal: opts.signal },
  );

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const verdict = parseVerdict(raw);
  const usage = completion.usage;
  const inTok = usage?.prompt_tokens ?? 0;
  const outTok = usage?.completion_tokens ?? 0;

  return {
    verdict,
    inputTokens: inTok,
    outputTokens: outTok,
    microUsd: microUsd("gpt-4o", inTok, outTok),
    model: VERDICT_MODEL,
    mock: false,
  };
}

function parseVerdict(raw: string): VerdictRead {
  let obj: Record<string, unknown> = {};
  try {
    obj = JSON.parse(raw);
  } catch {
    obj = {};
  }
  const r = obj as Record<string, unknown>;
  return {
    verdict: stringOr(r.verdict, "Verdict unavailable"),
    summary: stringOr(r.summary, ""),
    improvement: stringOr(r.improvement, ""),
    rebuy_zone: typeof r.rebuy_zone === "string" ? r.rebuy_zone : null,
    flags: Array.isArray(r.flags)
      ? ((r.flags as Array<Record<string, unknown>>)
          .map(parseFlag)
          .filter((f): f is AutopsyFlag => f !== null)
          .slice(0, 6))
      : [],
    concepts: Array.isArray(r.concepts)
      ? (r.concepts as unknown[]).filter((c): c is string => typeof c === "string").slice(0, 12)
      : [],
  };
}

function parseFlag(v: Record<string, unknown>): AutopsyFlag | null {
  const key = stringOr(v.key, "");
  const label = stringOr(v.label, "");
  const tone = stringOr(v.tone, "amber");
  if (!key || !label) return null;
  return {
    key,
    label,
    tone: (VALID_TONES.has(tone) ? tone : "amber") as AutopsyFlag["tone"],
    confidence: typeof v.confidence === "number" ? Math.max(0, Math.min(1, v.confidence)) : 0.5,
  };
}

function stringOr<T>(v: unknown, fallback: T): string | T {
  return typeof v === "string" ? v : fallback;
}
