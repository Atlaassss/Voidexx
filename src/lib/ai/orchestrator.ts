/**
 * AI orchestrator.
 *
 * Drives the autopsy pipeline end-to-end:
 *
 *   resolveImage -> visionPass -> verdictPass -> scoring -> persist
 *
 * Each phase emits a ProgressEvent through the supplied callback, which
 * the route handler streams as NDJSON to the client. Each phase has a
 * minimum dwell of MIN_PHASE_MS so the UI animation feels deliberate
 * even when the underlying call returns instantly (mock mode).
 */

import { resolveUploadToDataUrl } from "./imageFetch";
import { runVisionPass } from "./vision";
import { runVerdictPass } from "./verdict";
import { scoreAutopsy } from "./scoring";
import type {
  CostBreakdown,
  PipelinePhase,
  ProgressEvent,
  StructureRead,
  VerdictRead,
} from "./types";
import type { AutopsyResponse, Direction } from "../api/contracts";
import { tryGetDb } from "../db";

const MIN_PHASE_MS = 600;

export interface OrchestratorInput {
  userId: string;
  isDemoUser: boolean;
  uploadId: string;
  symbol?: string;
  timeframe?: string;
  direction?: Direction;
  notes?: string;
  /** Cancellation signal forwarded to OpenAI calls. */
  signal?: AbortSignal;
}

export type Emit = (event: ProgressEvent) => void;

export async function runAutopsy(input: OrchestratorInput, emit: Emit): Promise<void> {
  try {
    // ----- phase: fetch -----
    await phase(emit, "fetch", 10, "Resolving screenshot", async () => {
      // No-op in demo mode; real S3 fetch happens here.
    });
    const imageDataUrl = await resolveUploadToDataUrl(input.uploadId);

    // ----- phase: vision -----
    let structure: StructureRead;
    let visionMicroUsd = 0;
    let visionInTok = 0;
    let visionOutTok = 0;
    let visionModel = "voidexx-vision-mock-1";
    let pipelineMock = false;

    await phase(emit, "vision", 35, "Vision pass · OCR + structure", async () => {
      const v = await runVisionPass({
        uploadId: input.uploadId,
        imageDataUrl,
        hint: {
          symbol: input.symbol,
          timeframe: input.timeframe,
          direction: input.direction,
        },
        signal: input.signal,
      });
      structure = v.structure;
      visionMicroUsd = v.microUsd;
      visionInTok = v.inputTokens;
      visionOutTok = v.outputTokens;
      visionModel = v.model;
      pipelineMock = v.mock;
    });

    // ----- phase: verdict -----
    let verdict: VerdictRead;
    let verdictMicroUsd = 0;
    let verdictInTok = 0;
    let verdictOutTok = 0;
    let verdictModel = "voidexx-verdict-mock-1";

    await phase(emit, "verdict", 70, "Composing forensic verdict", async () => {
      const v = await runVerdictPass({
        uploadId: input.uploadId,
        structure: structure!,
        notes: input.notes,
        signal: input.signal,
      });
      verdict = v.verdict;
      verdictMicroUsd = v.microUsd;
      verdictInTok = v.inputTokens;
      verdictOutTok = v.outputTokens;
      verdictModel = v.model;
      pipelineMock = pipelineMock && v.mock;
    });

    // ----- phase: score -----
    let score = 0;
    await phase(emit, "score", 85, "Scoring discipline & risk", async () => {
      score = scoreAutopsy(structure!, verdict!);
    });

    const cost: CostBreakdown = {
      microUsd: visionMicroUsd + verdictMicroUsd,
      modelVision: visionModel,
      modelVerdict: verdictModel,
      visionInputTokens: visionInTok,
      visionOutputTokens: visionOutTok,
      verdictInputTokens: verdictInTok,
      verdictOutputTokens: verdictOutTok,
    };

    const tradeId = `trd_${randomId()}`;
    const autopsyId = `aut_${randomId()}`;

    const response: AutopsyResponse = {
      id: autopsyId,
      tradeId,
      score,
      verdict: verdict!.verdict,
      summary: verdict!.summary,
      improvement: verdict!.improvement,
      rebuyZone: verdict!.rebuy_zone ?? undefined,
      flags: verdict!.flags,
      concepts: verdict!.concepts,
      structure: structure! as unknown as Record<string, unknown>,
      cost: {
        microUsd: cost.microUsd,
        modelVision: cost.modelVision,
        modelVerdict: cost.modelVerdict,
      },
      mock: pipelineMock,
      createdAt: new Date().toISOString(),
    };

    // ----- phase: persist -----
    await phase(emit, "persist", 95, "Recording in journal", async () => {
      const db = tryGetDb();
      if (!db || input.isDemoUser) return;
      try {
        await db.trade.create({
          data: {
            id: tradeId,
            userId: input.userId,
            symbol: structure!.symbol ?? input.symbol ?? "UNKNOWN",
            timeframe: structure!.timeframe ?? input.timeframe ?? "?",
            direction: structure!.direction ?? input.direction ?? "SHORT",
            entry: structure!.trade_marks.entry ?? 0,
            stop: structure!.trade_marks.stop ?? null,
            target: structure!.trade_marks.target ?? null,
            outcome: "LOSS",
            openedAt: new Date(),
            closedAt: new Date(),
            tags: deriveTags(verdict!),
            notes: input.notes ?? null,
            screenshotUrl: null,
          },
        });
        await db.autopsy.create({
          data: {
            id: autopsyId,
            tradeId,
            userId: input.userId,
            score,
            verdict: verdict!.verdict,
            summary: verdict!.summary,
            improvement: verdict!.improvement,
            rebuyZone: verdict!.rebuy_zone ?? null,
            flags: verdict!.flags.map((f) => f.key),
            concepts: verdict!.concepts,
            structureJson: structure as unknown as object,
            modelVersion: `${cost.modelVision}+${cost.modelVerdict}`,
            costMicros: cost.microUsd,
          },
        });
      } catch (e) {
        console.error("[orchestrator] persistence failed", e);
      }
    });

    emit({ event: "done", report: response });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    emit({ event: "error", message });
  }
}

async function phase<T>(
  emit: Emit,
  id: PipelinePhase,
  pct: number,
  message: string,
  fn: () => Promise<T>,
): Promise<T> {
  emit({ event: "progress", phase: id, pct, message });
  const start = Date.now();
  const result = await fn();
  const elapsed = Date.now() - start;
  if (elapsed < MIN_PHASE_MS) {
    await new Promise((r) => setTimeout(r, MIN_PHASE_MS - elapsed));
  }
  return result;
}

function deriveTags(v: VerdictRead): string[] {
  const tags = new Set<string>();
  for (const f of v.flags) tags.add(f.key.replace(/_/g, "-"));
  for (const c of v.concepts.slice(0, 3)) tags.add(c);
  return [...tags].slice(0, 8);
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}
