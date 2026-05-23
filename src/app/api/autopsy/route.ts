import { requireUser, asResponse, ensureDbUser } from "@/lib/auth";
import { AutopsyRequestSchema, badRequest } from "@/lib/validation";
import { checkAndIncrementQuota, rollbackQuotaIncrement } from "@/lib/quota";
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
 * Quota is incremented BEFORE the orchestrator runs (so two parallel
 * uploads can't both pass the cap), and rolled back if the pipeline
 * fails for any reason — a vision-API hiccup shouldn't cost the user
 * one of their 5/month free autopsies.
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

  // Mirror the Clerk identity into the Postgres User table BEFORE any
  // FK-dependent reads/writes. Idempotent + cached per process.
  await ensureDbUser(user);

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
      // Track the orchestrator's outcome via the emit callback. The
      // orchestrator catches its own errors and emits {event:"error"}
      // rather than throwing, so we can't catch from out here. Instead
      // we observe the last event seen — `done` means success, anything
      // else (or absence) means we should refund the quota slot.
      //
      // Typed as `string` (not a union) because TS over-narrows reads
      // through the closure mutation and can't see that emit() reassigns.
      let outcome: string = "pending";

      const emit = (e: ProgressEvent) => {
        if (e.event === "done") outcome = "done";
        else if (e.event === "error") outcome = "error";
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
            userEmail: user.email,
            userDisplayName: user.displayName,
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
        // Defensive — orchestrator shouldn't throw, but if a bug slips
        // through we still want to surface something to the client.
        outcome = "error";
        emit({
          event: "error",
          message: err instanceof Error ? err.message : "internal_error",
        });
      } finally {
        // Refund quota on anything other than a clean `done`. Includes
        // explicit errors AND client cancellations (no event seen yet).
        if (outcome !== "done" && quota.plan === "RECON" && quota.allowed) {
          await rollbackQuotaIncrement(user.id);
        }
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
