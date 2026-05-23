import type { Metadata } from "next";
import { PageShell } from "../_PageShell";

export const metadata: Metadata = {
  title: "Press",
  description: "Press kit and contact for Voidexx.",
};

export default function PressPage() {
  return (
    <PageShell
      eyebrow="Company · Press"
      title="Press kit."
      italic="One-pager and assets."
    >
      <p>
        VOIDEXX is an AI Trade Autopsy SaaS — upload a screenshot of a
        losing trade, get a structured forensic report a prop-firm desk
        would write. Pricing starts free; paid tiers from $24/month or
        ₱1,344/month (PayMongo · Philippines).
      </p>

      <h2>Boilerplate</h2>
      <p>
        VOIDEXX is analytical software for retail traders. The platform
        reads chart screenshots, decodes ICT/SMC structural mechanics,
        scores trader psychology against a deterministic rubric, and
        writes a forensic autopsy of why the trade went the way it did.
        Not advice — exposed mechanics.
      </p>

      <h2>At a glance</h2>
      <ul>
        <li>Founded · 2026, Manila.</li>
        <li>Funding · self-funded so far.</li>
        <li>Customers · 14 countries at v0.1.</li>
        <li>Stack · Next.js · TypeScript · Postgres · OpenAI gpt-4o.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        <a href="mailto:press@voidexx.io">press@voidexx.io</a> — we
        respond within 24 hours on weekdays. Logo and screenshots
        available on request; the brand uses the &ldquo;Jailbroken
        Terminal&rdquo; aesthetic — Anton headlines, signal-green accent
        on a pure-black canvas.
      </p>
    </PageShell>
  );
}
