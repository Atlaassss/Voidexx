import type { Metadata } from "next";
import { PageShell } from "../_PageShell";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Voidexx — by topic.",
};

const CHANNELS = [
  {
    label: "Support",
    email: "support@voidexx.io",
    detail:
      "Account, billing, exchange-link, autopsy bugs. SLA: 24h on weekdays.",
  },
  {
    label: "Security",
    email: "security@voidexx.io",
    detail:
      "Vulnerability reports. Triage within 24h, named credit on the security page.",
  },
  {
    label: "Press",
    email: "press@voidexx.io",
    detail: "Boilerplate, logo, founder interviews.",
  },
  {
    label: "Careers",
    email: "hiring@voidexx.io",
    detail:
      "Pitch + portfolio. We don't use applicant tracking — a person reads every email.",
  },
  {
    label: "Partnerships",
    email: "ops@voidexx.io",
    detail: "Prop firms, exchange integrations, content partners.",
  },
  {
    label: "Legal",
    email: "legal@voidexx.io",
    detail: "DPA sign-off, contract redlines, compliance review.",
  },
];

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Company · Contact"
      title="By topic."
      italic="Pick the right inbox."
    >
      <p>
        We don&apos;t run a contact form because every form we&apos;ve
        built ends up routing to the wrong inbox. Email is more honest.
      </p>

      <ul className="!mt-8 !space-y-4">
        {CHANNELS.map((c) => (
          <li
            key={c.email}
            className="!pl-0 !before:content-none border border-void-300/70 bg-void-100/40 p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-widest2 text-signal-cyan">
                {c.label}
              </span>
              <a
                href={`mailto:${c.email}`}
                className="font-mono text-[12px] text-void-900 hover:text-signal-cyan transition"
              >
                {c.email}
              </a>
            </div>
            <p className="mt-2 text-[14px] text-void-800">{c.detail}</p>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
