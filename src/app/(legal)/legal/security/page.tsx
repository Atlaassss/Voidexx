import type { Metadata } from "next";
import { PageShell } from "../../_PageShell";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Voidexx security posture — encryption, key handling, webhook verification.",
};

export default function SecurityPage() {
  return (
    <PageShell
      eyebrow="Legal · Security"
      title="Security."
      italic="Non-negotiables."
      updated="May 23, 2026"
    >
      <p>
        We treat exchange API keys as live ammunition. Everything below is
        enforced in code, not aspirational.
      </p>

      <h2>Transport</h2>
      <ul>
        <li>TLS 1.2+ everywhere; HSTS preload; HTTP/2.</li>
        <li>Strict CSP, frame-ancestors <code>&apos;none&apos;</code>, no eval.</li>
        <li>No third-party scripts on authenticated routes.</li>
      </ul>

      <h2>Credential vault</h2>
      <ul>
        <li>Exchange secrets are AES-256-GCM encrypted on the server. The 32-byte master key lives in <code>EXCHANGE_ENCRYPTION_KEY</code> and is never shipped to the client.</li>
        <li>We refuse exchange keys with withdraw scope server-side at the connect probe.</li>
        <li>Every order-placement request requires a fresh TOTP-verified consent token (5-minute TTL, single-use).</li>
      </ul>

      <h2>Webhook verification</h2>
      <ul>
        <li>Stripe — HMAC-SHA256 signed; 5-minute tolerance; production refuses unverified events.</li>
        <li>PayMongo — same pattern, header parsed with constant-time compare per mode (test vs live).</li>
        <li>Idempotency on (provider, eventId) prevents replay.</li>
      </ul>

      <h2>Reporting an issue</h2>
      <p>
        Email <a href="mailto:security@voidexx.io">security@voidexx.io</a>{" "}
        — we triage within 24h and credit reporters on the security page
        unless they prefer otherwise. We do not run a paid bounty yet.
      </p>
    </PageShell>
  );
}
