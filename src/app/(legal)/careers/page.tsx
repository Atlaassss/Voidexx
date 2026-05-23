import type { Metadata } from "next";
import { PageShell } from "../_PageShell";

export const metadata: Metadata = {
  title: "Careers",
  description: "Open roles at Voidexx.",
};

export default function CareersPage() {
  return (
    <PageShell
      eyebrow="Company · Careers"
      title="Open roles."
      italic="Small team. Sharp work."
    >
      <p>
        We&apos;re a team of four right now (two founders, an ML engineer,
        and a product designer). We&apos;re hiring carefully — no role goes
        live until we have a concrete project for the first 90 days.
      </p>

      <h2>What we look for, regardless of role</h2>
      <ul>
        <li>You&apos;ve traded real money — at any scale — and felt the trap that took your stop.</li>
        <li>You can ship a feature end-to-end, including the production migration and the post-deploy smoke test.</li>
        <li>You&apos;d rather refuse a feature than add a half-broken one.</li>
      </ul>

      <h2>Currently open</h2>
      <p>
        <em>Nothing posted publicly.</em> If you read this whole page and
        still think you&apos;d be a fit, send a 200-word pitch on the trade
        autopsy you&apos;d ship next, and a link to something you&apos;ve
        previously built end-to-end. <a href="mailto:hiring@voidexx.io">hiring@voidexx.io</a>.
      </p>

      <p className="mt-8">
        We don&apos;t use applicant tracking systems. A real person reads
        every email.
      </p>
    </PageShell>
  );
}
