/**
 * Webhook idempotency guard.
 *
 * Before processing an inbound webhook event (Stripe, PayPal, exchange):
 *   1. Try to INSERT a WebhookEvent row with status "processing"
 *   2. If the unique constraint (provider, eventId) fires → duplicate → skip
 *   3. After processing, mark "done" or "failed"
 *
 * This prevents double-processing caused by Stripe retries, network
 * glitches, or replayed events — critical for payment state machines.
 */

import { tryGetDb } from "./db";

export type IdempotencyResult =
  | { duplicate: false; markDone: () => Promise<void>; markFailed: (reason?: string) => Promise<void> }
  | { duplicate: true };

/**
 * Attempt to claim an event for processing. Returns `{ duplicate: true }`
 * if the event was already processed or is currently being processed.
 *
 * When DB is not configured, returns non-duplicate so the handler can
 * proceed (demo mode / early dev).
 */
export async function claimWebhookEvent(
  provider: string,
  eventId: string,
  eventType: string,
  payload?: unknown,
): Promise<IdempotencyResult> {
  const db = tryGetDb();
  if (!db) {
    // No DB: can't track idempotency. Proceed (acceptable in demo/dev).
    return {
      duplicate: false,
      markDone: async () => {},
      markFailed: async () => {},
    };
  }

  try {
    const row = await db.webhookEvent.create({
      data: {
        provider,
        eventId,
        eventType,
        status: "processing",
        payload: payload != null ? (payload as object) : undefined,
      },
    });

    return {
      duplicate: false,
      markDone: async () => {
        await db.webhookEvent.update({
          where: { id: row.id },
          data: { status: "done", processedAt: new Date() },
        }).catch((err) => {
          console.error("[webhook-idempotency] markDone failed", err);
        });
      },
      markFailed: async (reason?: string) => {
        await db.webhookEvent.update({
          where: { id: row.id },
          data: {
            status: "failed",
            processedAt: new Date(),
            // Store failure reason in payload if no original payload
            ...(reason && !payload ? { payload: { _failReason: reason } } : {}),
          },
        }).catch((err) => {
          console.error("[webhook-idempotency] markFailed failed", err);
        });
      },
    };
  } catch (err) {
    // P2002 = unique constraint violation → already claimed
    if ((err as { code?: string })?.code === "P2002") {
      return { duplicate: true };
    }
    // Unknown error: log and let the handler proceed (fail-open for
    // availability — the handler's own idempotency via providerRef UNIQUE
    // on Payment is a second layer of defense).
    console.error("[webhook-idempotency] claim failed", err);
    return {
      duplicate: false,
      markDone: async () => {},
      markFailed: async () => {},
    };
  }
}
