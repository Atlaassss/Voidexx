import { env } from "@/lib/env";
import { DemoBannerClient } from "./DemoBannerClient";

/**
 * Server-side gate for the demo banner.
 *
 * Returns null (renders nothing) in any of these cases:
 *
 *   1. Every subsystem is wired (production-ready). This is the
 *      happy path — once you've completed the README launch checklist,
 *      the banner disappears on its own.
 *   2. `NEXT_PUBLIC_HIDE_DEMO_BANNER=1` is set. Use this for
 *      client previews / staging where you want the marketing site
 *      and dashboard to look "live" even though some subsystems
 *      are still mocked.
 *
 * Otherwise it hands the missing-subsystems list to the client
 * component, which renders the banner with a session-level dismiss
 * button.
 *
 * Note: server-only secrets (DATABASE_URL, OPENAI_API_KEY, etc.) are
 * checked here on the server. The list of "missing" subsystems is
 * passed to the client as plain string tokens — we never leak the
 * actual secret values to the browser.
 */
export function DemoBanner() {
  // Hard-off via env flag — for client previews / staging deploys
  // where the demo banner would just be visual noise.
  if (process.env.NEXT_PUBLIC_HIDE_DEMO_BANNER === "1") return null;

  const missing: string[] = [];
  if (!env.clerk.enabled) missing.push("auth");
  if (!env.db.enabled) missing.push("db");
  if (!env.s3.enabled) missing.push("uploads");
  if (!env.openai.enabled) missing.push("ai");
  if (!env.stripe.enabled && !env.paymongo.enabled) missing.push("billing");
  if (!env.exchange.enabled) missing.push("exchange");
  if (!env.admin.enabled) missing.push("admin");
  if (!env.email.enabled) missing.push("email");

  if (missing.length === 0) return null;

  return <DemoBannerClient missing={missing} />;
}
