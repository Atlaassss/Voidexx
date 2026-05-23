import type { Metadata } from "next";
import { PageShell } from "../../_PageShell";

export const metadata: Metadata = {
  title: "Data Processing Addendum",
  description: "Voidexx DPA — processor relationships, sub-processors, and SCCs.",
};

export default function DpaPage() {
  return (
    <PageShell
      eyebrow="Legal · DPA"
      title="DPA."
      italic="Processor relationships."
      updated="May 23, 2026"
    >
      <p>
        Voidexx acts as a <strong>data processor</strong> for the trade
        screenshots and autopsies you upload, and as a <strong>data controller</strong>{" "}
        for account and billing data we collect directly.
      </p>

      <h2>Sub-processors</h2>
      <ul>
        <li><strong>Clerk</strong> — auth + session storage.</li>
        <li><strong>Supabase / Postgres host</strong> — primary database.</li>
        <li><strong>Cloudflare R2 / AWS S3</strong> — screenshot storage.</li>
        <li><strong>OpenAI</strong> — vision + verdict passes. Not used for training; we send <code>store: false</code>.</li>
        <li><strong>Stripe</strong> — global card processing.</li>
        <li><strong>PayMongo</strong> — Philippine payment processing.</li>
        <li><strong>Resend</strong> — transactional email.</li>
        <li><strong>Vercel</strong> — application hosting.</li>
      </ul>

      <h2>Cross-border transfers</h2>
      <p>
        EU/UK customers — Standard Contractual Clauses are in place with
        all sub-processors. Philippine customers — DPA-2012 compliant
        consent flow runs at signup.
      </p>

      <h2>This is a stub</h2>
      <p>
        Sign-off-ready DPA ships at v1.0. Enterprise pre-orders →{" "}
        <a href="mailto:legal@voidexx.io">legal@voidexx.io</a>.
      </p>
    </PageShell>
  );
}
