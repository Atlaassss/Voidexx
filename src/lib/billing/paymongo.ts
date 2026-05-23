/**
 * PayMongo client + signature verification.
 *
 * PayMongo is the Philippine payment rail — covers GCash, Maya,
 * GrabPay, BPI, BDO, UnionBank online + cards (Visa/MC/JCB/Amex).
 *
 * We use the PaymentIntent + PaymentMethod ("Payments API") flow rather
 * than the older Sources API, because Sources is being deprecated and
 * intents handle 3-D Secure cleanly across both card and e-wallet
 * methods. The high-level dance:
 *
 *   1. POST /payment_intents     → returns id + client_key
 *   2. POST /payment_methods     → returns id (for cards: tokenises card; for ewallets: opaque)
 *   3. POST /payment_intents/:id/attach with method id + return_url
 *   4. → PayMongo redirects user to method's auth page (GCash app, etc.)
 *   5. → On success, user lands on return_url AND webhook fires payment_intent.succeeded
 *
 * Settlement is the webhook — never the redirect — because the user
 * can close the tab between step 4 and step 5 and we'd otherwise lose
 * the upgrade event.
 *
 * --- Auth ---
 *
 * Every request uses HTTP Basic with the secret key as the username
 * and an empty password:
 *
 *   Authorization: Basic base64(SECRET_KEY + ":")
 *
 * That's PayMongo's spec, not ours.
 *
 * --- Signature verification ---
 *
 * Webhook signatures use HMAC-SHA256 over `t=<timestamp>.<rawBody>`,
 * with the timestamp and signature both encoded into the
 * `Paymongo-Signature` header as `t=<ts>,te=<test>,li=<live>`. We
 * compare against `te` in test mode and `li` in live mode.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env";

// ---------------------------------------------------------------------------
// Types — PayMongo's API uses a JSON:API-ish "data { type, id, attributes }"
// envelope on every response. We unwrap it in `paymongoFetch` so callers see
// the inner shape directly.
// ---------------------------------------------------------------------------

export type PaymongoMethod =
  | "gcash"
  | "grab_pay"
  | "paymaya"
  | "card"
  | "billease"
  | "dob"
  | "dob_ubp";

/** Subset of fields we actually read off a PaymentIntent. */
export interface PaymentIntent {
  id: string;
  status:
    | "awaiting_payment_method"
    | "awaiting_next_action"
    | "processing"
    | "succeeded"
    | "cancelled";
  amount: number; // centavos
  currency: string; // "PHP"
  client_key: string;
  next_action: {
    type: "redirect";
    redirect: { url: string; return_url: string };
  } | null;
  metadata: Record<string, string> | null;
  payments?: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    description: string | null;
  }>;
}

interface PaymongoErrorBody {
  errors: Array<{
    code?: string;
    detail: string;
    source?: { pointer?: string; attribute?: string };
  }>;
}

export class PaymongoApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: PaymongoErrorBody | string,
  ) {
    super(
      typeof body === "string"
        ? `PayMongo ${status}: ${body}`
        : `PayMongo ${status}: ${body.errors.map((e) => e.detail).join("; ")}`,
    );
    this.name = "PaymongoApiError";
  }
}

const PAYMONGO_BASE = "https://api.paymongo.com/v1";

/**
 * Low-level fetch wrapper.
 *
 * - Adds Basic auth from PAYMONGO_SECRET_KEY
 * - Sets Content-Type for bodies
 * - Wraps non-2xx in PaymongoApiError
 * - Unwraps the `{ data: { attributes: {...}, id } }` envelope
 *
 * The signature uses an explicit RequestInit spread (rather than `init?` →
 * passthrough) because PayMongo rejects unrecognised headers — we MUST
 * own the headers object completely. Earlier drafts used
 *
 *   fetch(url, { ...init, headers: { ... } })
 *
 * which let caller-supplied headers leak through and triggered 400s on
 * accept-language, x-correlation-id, etc. that Next.js threads added
 * to outbound fetches by default. The current implementation builds a
 * fresh headers object, copies only the body/method/signal from init,
 * and explicitly sets Authorization + Content-Type + Accept.
 */
export async function paymongoFetch<T>(
  path: string,
  init: {
    method?: "GET" | "POST" | "DELETE";
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  if (!env.paymongo.enabled) {
    throw new Error("PAYMONGO_SECRET_KEY not configured");
  }
  const method = init.method ?? "GET";

  // Basic auth: secret key as username, blank password.
  const auth = Buffer.from(`${env.paymongo.secretKey}:`).toString("base64");

  const res = await fetch(`${PAYMONGO_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
    // Force Node fetch — Next sometimes routes through a fetch shim that
    // adds caching headers we don't want hitting an idempotent-sensitive
    // payment provider.
    cache: "no-store",
  });

  // Always parse — PayMongo errors come back as JSON too.
  let parsed: unknown;
  const text = await res.text();
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    throw new PaymongoApiError(
      res.status,
      typeof parsed === "object" && parsed !== null && "errors" in parsed
        ? (parsed as PaymongoErrorBody)
        : (text || `${res.status}`),
    );
  }

  // Unwrap { data: { id, attributes } } → { id, ...attributes }
  if (
    parsed &&
    typeof parsed === "object" &&
    "data" in parsed &&
    parsed.data &&
    typeof parsed.data === "object"
  ) {
    const data = parsed.data as { id?: string; attributes?: Record<string, unknown> };
    if (data.attributes) {
      return { id: data.id, ...data.attributes } as T;
    }
  }
  return parsed as T;
}

// ---------------------------------------------------------------------------
// Domain helpers — small wrappers around paymongoFetch with typed inputs.
// ---------------------------------------------------------------------------

/**
 * Create a PaymentIntent. Returns the intent including its `client_key`,
 * which we DON'T expose to the browser in our flow (we attach the
 * method server-side after the user picks one), but PayMongo requires
 * it on the response shape.
 */
export async function createPaymentIntent(opts: {
  amount: number; // centavos
  currency?: string; // default PHP
  description?: string;
  paymentMethodAllowed: PaymongoMethod[];
  metadata?: Record<string, string>;
}): Promise<PaymentIntent> {
  return paymongoFetch<PaymentIntent>("/payment_intents", {
    method: "POST",
    body: {
      data: {
        attributes: {
          amount: opts.amount,
          currency: opts.currency ?? "PHP",
          description: opts.description ?? "Voidexx subscription",
          payment_method_allowed: opts.paymentMethodAllowed,
          payment_method_options: opts.paymentMethodAllowed.includes("card")
            ? {
                card: {
                  // Always require 3DS — PayMongo recommends this for
                  // any transaction over PHP 1000 (we're at PHP 1200+).
                  request_three_d_secure: "any",
                },
              }
            : undefined,
          // BIR receipt requirements — PayMongo passes these through to
          // the buyer's invoice. Empty strings disable the section.
          statement_descriptor: "VOIDEXX",
          metadata: opts.metadata ?? {},
        },
      },
    },
  });
}

/**
 * Create a payment method (e-wallet variant). For cards we'd accept
 * a tokenised card from the browser via the Public Key — but to avoid
 * shipping a card form in Phase 7.1 we stick to redirect-based methods
 * (gcash / maya / grab_pay / dob / dob_ubp / billease).
 */
export async function createEwalletPaymentMethod(opts: {
  type: Exclude<PaymongoMethod, "card">;
  billing: { name: string; email: string };
}): Promise<{ id: string; type: PaymongoMethod }> {
  return paymongoFetch<{ id: string; type: PaymongoMethod }>("/payment_methods", {
    method: "POST",
    body: {
      data: {
        attributes: {
          type: opts.type,
          billing: {
            name: opts.billing.name,
            email: opts.billing.email,
          },
        },
      },
    },
  });
}

/** Attach method to intent → triggers redirect. */
export async function attachPaymentMethod(opts: {
  intentId: string;
  methodId: string;
  returnUrl: string;
  clientKey: string;
}): Promise<PaymentIntent> {
  return paymongoFetch<PaymentIntent>(
    `/payment_intents/${opts.intentId}/attach`,
    {
      method: "POST",
      body: {
        data: {
          attributes: {
            payment_method: opts.methodId,
            client_key: opts.clientKey,
            return_url: opts.returnUrl,
          },
        },
      },
    },
  );
}

/** Read an intent by id (used by the cron sweep + return-url handler). */
export async function getPaymentIntent(intentId: string): Promise<PaymentIntent> {
  return paymongoFetch<PaymentIntent>(`/payment_intents/${intentId}?expand[]=payments`);
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

/**
 * Verify a PayMongo webhook signature. Header format:
 *
 *   Paymongo-Signature: t=<unix>,te=<sig>,li=<sig>
 *
 *   - t  : unix timestamp of the event
 *   - te : test-mode signature
 *   - li : live-mode signature
 *
 * The signed payload is `${t}.${rawBody}`, HMAC-SHA256 with the
 * webhook secret, hex-encoded.
 *
 * We accept the signature whose mode matches the configured key — if
 * it's a test secret (sk_test_*) we check `te`; otherwise `li`.
 *
 * @returns true if signature matches; false otherwise (constant-time).
 */
export function verifyWebhookSignature(opts: {
  signatureHeader: string | null;
  rawBody: string;
  /** Provided secret — defaults to env.paymongo.webhookSecret. */
  secret?: string;
  /** Max age tolerance in seconds. Default: 5 minutes. */
  toleranceSeconds?: number;
}): boolean {
  const header = opts.signatureHeader;
  const secret = opts.secret ?? env.paymongo.webhookSecret;
  if (!header || !secret) return false;

  // Parse k=v,k=v,...
  const parts = header.split(",").reduce<Record<string, string>>((acc, kv) => {
    const [k, v] = kv.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const t = parts.t;
  if (!t) return false;

  // Pick the signature to compare against based on the secret's flavour.
  // Test secrets start with "whsk_test_" / live with "whsk_live_". We
  // also fall back to whichever side is present so a misconfigured
  // secret doesn't silently drop every event.
  const isTestSecret = secret.includes("_test_");
  const expected = isTestSecret ? parts.te : parts.li;
  const fallback = isTestSecret ? parts.li : parts.te;
  const sig = expected ?? fallback;
  if (!sig) return false;

  // Tolerance check — reject events older than N seconds.
  const tolerance = opts.toleranceSeconds ?? 300;
  const now = Math.floor(Date.now() / 1000);
  const eventTime = Number.parseInt(t, 10);
  if (!Number.isFinite(eventTime)) return false;
  if (Math.abs(now - eventTime) > tolerance) return false;

  // HMAC-SHA256 over `t.body`.
  const computed = createHmac("sha256", secret)
    .update(`${t}.${opts.rawBody}`, "utf8")
    .digest("hex");

  // Constant-time compare. `timingSafeEqual` requires equal-length buffers.
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(sig, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Webhook event types
// ---------------------------------------------------------------------------

export interface PaymongoEvent {
  id: string;
  type:
    | "payment.paid"
    | "payment.failed"
    | "payment_intent.succeeded"
    | "payment_intent.payment_failed"
    | "source.chargeable"
    | "checkout_session.payment.paid";
  data: {
    id: string;
    attributes: {
      type: string;
      data: {
        id: string;
        attributes: Record<string, unknown>;
      };
    };
  };
}

/**
 * Helper to extract our voidexxUserId metadata stamped on the intent at
 * creation time. Returns null if the metadata isn't a recognisable
 * shape — we'd then fall back to other reconciliation paths.
 */
export function userIdFromEvent(event: PaymongoEvent): string | null {
  const inner = event.data?.attributes?.data?.attributes as
    | { metadata?: Record<string, string> }
    | undefined;
  return inner?.metadata?.voidexxUserId ?? null;
}
