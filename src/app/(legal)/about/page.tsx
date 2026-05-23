import type { Metadata } from "next";
import { PageShell } from "../_PageShell";

export const metadata: Metadata = {
  title: "About",
  description: "What Voidexx is, why it exists, and who's building it.",
};

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="Company · About"
      title="Who we are."
      italic="And why we built this."
    >
      <p>
        VOIDEXX started because every retail trader we know has the same
        post-mortem ritual after a losing trade: scroll through the chart
        again, mutter about liquidity, and never really learn anything.
        Prop-firm desks have a different ritual — a structured autopsy,
        written by a senior, that names the mechanic that took the stop.
      </p>

      <p>
        We built the AI version of the prop-desk ritual. You drop the
        screenshot. The engine reads the structure, decodes the smart-money
        mechanics, scores the psychology, and writes the autopsy a senior
        would. The score is a transparent rule, not a prompt — so it
        doesn&apos;t drift across model updates.
      </p>

      <h2>What we believe</h2>
      <ul>
        <li>The market is mostly inefficient at the retail-trader level because retail traders won&apos;t do post-mortems.</li>
        <li>An AI that helps you see the trap that took your stop is more valuable than one that promises to predict the next bar.</li>
        <li>Trading software should never give advice. It should expose mechanics.</li>
      </ul>

      <h2>Where we&apos;re based</h2>
      <p>
        Manila, with collaborators in Singapore and London. Customers in 14
        countries as of the v0.1 launch.
      </p>

      <p className="mt-8">
        Press &amp; partnerships → <a href="mailto:ops@voidexx.io">ops@voidexx.io</a>.
      </p>
    </PageShell>
  );
}
