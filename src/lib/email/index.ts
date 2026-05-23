/**
 * Email — transactional via Resend.
 *
 * Demo mode: when RESEND_API_KEY isn't set, every send() call logs the
 * full email to stdout and returns success. This keeps the welcome /
 * autopsy-ready / plan-changed flows wired in the dev UI without
 * actually shipping mail.
 *
 * Templates are plain HTML strings (no React Email dependency) — the
 * rendered output is small (under 4KB each) and dead-simple to inspect
 * during demos. If we ever need richer composition we can swap in
 * `@react-email/render` without changing the call sites.
 */

import { env } from "../env";
import { logger } from "../logger";
import { renderWelcome, renderAutopsyReady, renderPlanChanged } from "./templates";

const log = logger("email");

/** Provider-agnostic send result. */
export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
  demo?: boolean;
}

interface SendInput {
  to: string;
  subject: string;
  html: string;
  /** Optional plain-text alt for clients that strip HTML. */
  text?: string;
}

/**
 * Send a transactional email. Returns success even in demo mode so
 * callers can check `.ok` without branching on env.
 */
export async function send(input: SendInput): Promise<SendResult> {
  // Always log the send attempt — visible in production logs (audit trail
  // for "did we email user X about event Y") AND in dev (debug aid).
  log.info("Email send", { to: redactEmail(input.to), subject: input.subject });

  if (!env.email.enabled) {
    if (process.env.NODE_ENV === "development") {
      // Loud in dev so the developer sees what would have shipped.
      console.log("\n[email/demo] To:", input.to);
      console.log("[email/demo] Subject:", input.subject);
      console.log("[email/demo] HTML preview (first 200 chars):");
      console.log(input.html.slice(0, 200), "...\n");
    }
    return { ok: true, demo: true };
  }

  try {
    // Dynamic import so we don't pay Resend's bundle cost in demo mode.
    const { Resend } = await import("resend");
    const resend = new Resend(env.email.resendApiKey!);
    const result = await resend.emails.send({
      from: env.email.fromAddress,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (result.error) {
      log.error("Resend send returned error", { error: result.error.message });
      return { ok: false, error: result.error.message };
    }
    return { ok: true, id: result.data?.id };
  } catch (err) {
    log.error("Email send failed", { err: String(err) });
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

/** First letter + domain — keeps logs out of GDPR territory. */
function redactEmail(addr: string): string {
  const [local, domain] = addr.split("@");
  if (!local || !domain) return "***";
  return `${local.charAt(0)}***@${domain}`;
}

// ---------------------------------------------------------------------------
// Convenience wrappers for the three flows we send from
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(opts: {
  to: string | null;
  displayName: string | null;
}): Promise<SendResult> {
  if (!opts.to) return { ok: false, error: "no_recipient" };
  const tpl = renderWelcome({ displayName: opts.displayName ?? "Operator" });
  return send({ to: opts.to, ...tpl });
}

export async function sendAutopsyReadyEmail(opts: {
  to: string | null;
  displayName: string | null;
  autopsyId: string;
  score: number;
  verdict: string;
}): Promise<SendResult> {
  if (!opts.to) return { ok: false, error: "no_recipient" };
  const tpl = renderAutopsyReady({
    displayName: opts.displayName ?? "Operator",
    autopsyId: opts.autopsyId,
    score: opts.score,
    verdict: opts.verdict,
    appUrl: env.app.url,
  });
  return send({ to: opts.to, ...tpl });
}

export async function sendPlanChangedEmail(opts: {
  to: string | null;
  displayName: string | null;
  newPlan: string;
  status: string | null;
}): Promise<SendResult> {
  if (!opts.to) return { ok: false, error: "no_recipient" };
  const tpl = renderPlanChanged({
    displayName: opts.displayName ?? "Operator",
    newPlan: opts.newPlan,
    status: opts.status ?? "active",
    appUrl: env.app.url,
  });
  return send({ to: opts.to, ...tpl });
}
