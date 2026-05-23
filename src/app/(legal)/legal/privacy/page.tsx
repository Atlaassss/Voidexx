import type { Metadata } from "next";
import { PageShell } from "../../_PageShell";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Voidexx Privacy Policy — what we store, what we don't, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Legal · Privacy"
      title="Privacy."
      italic="What stays, what doesn't."
      updated="May 23, 2026"
    >
      <p>
        We want as little of your data as is feasible to run the autopsy
        engine, and we want you to be able to leave with all of it.
      </p>

      <h2>What we store</h2>
      <ul>
        <li><strong>Identity:</strong> email + display name, sourced from Clerk.</li>
        <li><strong>Trade screenshots:</strong> in our S3-compatible bucket. Encrypted at rest.</li>
        <li><strong>Autopsy reports:</strong> the structured JSON we generate from the screenshots.</li>
        <li><strong>Exchange API keys:</strong> AES-256-GCM encrypted on the server. Never sent to your browser. Read-only scope only.</li>
        <li><strong>Payment records:</strong> Stripe / PayMongo charge IDs and amounts. We never see your card.</li>
      </ul>

      <h2>What we don&apos;t store</h2>
      <ul>
        <li>Your card or bank account details — those live with Stripe / PayMongo.</li>
        <li>Your exchange withdraw permissions — we refuse keys with withdraw scope.</li>
        <li>The screenshot upload after you delete it. Object delete is hard delete, not a tombstone.</li>
      </ul>

      <h2>Export and delete</h2>
      <p>
        From <code>/dashboard/settings</code> you can export every piece of
        data we hold for you in a single JSON file, or trigger a hard
        purge of your account. Both run synchronously.
      </p>

      <h2>This is a stub</h2>
      <p>
        Full GDPR/PDPA-shaped policy ships with v1.0. Email{" "}
        <a href="mailto:ops@voidexx.io">ops@voidexx.io</a> for the
        compliance-grade copy.
      </p>
    </PageShell>
  );
}
