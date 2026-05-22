import { requireUser, asResponse } from "@/lib/auth";
import { AutopsyRequestSchema, badRequest } from "@/lib/validation";
import { checkAndIncrementQuota } from "@/lib/quota";
import { runAutopsy } from "@/lib/ai/orchestrator";
import type { ProgressEvent } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/autopsy
 *
 * Streams the autopsy pipeline as NDJSON. Each line is one ProgressEvent:
 *
 *   {"event":"progress","phase":"vision","pct":35,"message":"Vision pass · OCR + structure"}
 *   {"event":"progress","phase":"verdict","pct":70,...}
 *   {"event":"done","report":{...AutopsyResponse}}
 *   {"event":"error","message":"..."}
 *
 * The server respects request cancellation: if the client closes the
 * connection mid-flight, an AbortController forwards the signal to the
 * OpenAI calls so we don't burn tokens on abandoned uploads.
 *
 * NDJSON over fetch streaming is preferred over Server-Sent Events here
 * because SSE doesn't support POST bodies in browsers.
 */
export async function POST(req: Request) {
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch (err) {
    const r = asResponse(err);
    return r ?? new Response("Unauthorized", { status: 401 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = AutopsyRequestSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error);

  const quota = await checkAndIncrementQuota(user.id);
  if (!quota.allowed) {
    return Response.json(
      {
        error: "quota_exceeded",
        plan: quota.plan,
        used: quota.used,
        limit: quota.limit,
        message: "Free tier autopsies exhausted for this month. Upgrade to Operator.",
      },
      { status: 402 },
    );
  }

  const encoder = new TextEncoder();
  const ac = new AbortController();
  // Forward client disconnect to the orchestrator → OpenAI
  req.signal.addEventListener("abort", () => ac.abort());

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: ProgressEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          // controller already closed — request was aborted
        }
      };
      try {
        await runAutopsy(
          {
            userId: user.id,
            isDemoUser: user.isDemo,
            uploadId: parsed.data.uploadId,
            symbol: parsed.data.symbol,
            timeframe: parsed.data.timeframe,
            direction: parsed.data.direction,
            notes: parsed.data.notes,
            signal: ac.signal,
          },
          emit,
        );
      } catch (err) {
        emit({
          event: "error",
          message: err instanceof Error ? err.message : "internal_error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-quota-used": String(quota.used),
      "x-quota-limit": String(quota.limit),
    },
  });
}
