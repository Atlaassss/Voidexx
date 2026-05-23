import type { Metadata } from "next";
import { PageShell } from "../../_PageShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Voidexx Terms of Service — analytical software for traders. Not advice.",
};

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal · Terms of Service"
      title="Terms."
      italic="The short version that matters."
      updated="May 23, 2026"
    >
      <p>
        VOIDEXX is analytical software. It reads charts, decodes structure,
        and writes after-action reports on trades you upload. It does not
        execute trades on your behalf without explicit consent and a
        2&#8209;factor confirmation, and it never gives financial advice.
      </p>

      <h2>What you agree to by using the service</h2>
      <ul>
        <li>You are at least 18 years old in your jurisdiction.</li>
        <li>You will not upload screenshots that aren&apos;t yours, contain other people&apos;s PII, or violate copyright.</li>
        <li>You understand that trading involves substantial risk of loss and Voidexx is not liable for losses on trades you take.</li>
        <li>You will not attempt to reverse-engineer, scrape, or rate-limit-abuse the autopsy engine.</li>
      </ul>

      <h2>Refunds</h2>
      <p>
        14-day money-back window on the first paid month. After that,
        cancel anytime via <code>/dashboard/billing</code>; access continues
        through the end of the current billing period.
      </p>

      <h2>This is a stub</h2>
      <p>
        Real terms ship with the v1.0 launch. If you need them sooner for a
        compliance review, email <a href="mailto:ops@voidexx.io">ops@voidexx.io</a>.
      </p>
    </PageShell>
  );
}
