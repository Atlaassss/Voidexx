"use client";

import { useState } from "react";
import { ChevronDown, Copy, ExternalLink } from "lucide-react";

interface PaymongoSetupGuideProps {
  /** App URL (set via NEXT_PUBLIC_APP_URL). Used to render the webhook target. */
  appUrl: string;
  /** When true, the host already has PayMongo wired and only needs the webhook secret. */
  partial: boolean;
}

const STEPS: Array<{
  n: string;
  title: string;
  body: string;
  /** Optional follow-up tip rendered in a quieter tone. */
  tip?: string;
}> = [
  {
    n: "01",
    title: "Sign up at the PayMongo dashboard",
    body: "Use the business email you'll keep forever — it shows on customer receipts. PayMongo sends activation links + payouts to this address.",
    tip: "Solo proprietors can register under their personal name; corps need DTI/SEC docs ready.",
  },
  {
    n: "02",
    title: "Activate the merchant account",
    body: "Upload IDs, business permits, DTI/SEC paperwork. Activation usually clears in 1-3 business days. Test keys (sk_test_*) work immediately; live keys (sk_live_*) require activation.",
  },
  {
    n: "03",
    title: "Connect your settlement bank account",
    body: "Settings → Settlement → add a peso account (BPI / BDO / UnionBank / Metrobank etc.). Verification is a small-deposit-match flow. First payout has a 7-day hold for new merchants; weekly cadence after that.",
  },
  {
    n: "04",
    title: "Copy your live API keys",
    body: "Developers → API Keys. Paste sk_live_* into PAYMONGO_SECRET_KEY and pk_live_* into NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY in your deployment env.",
    tip: "Easy mistake: the sk_ key is the one we sign requests with. pk_ is browser-safe and only needed if you add card-tokenisation later.",
  },
  {
    n: "05",
    title: "Create a webhook endpoint",
    body: "Developers → Webhooks → New endpoint. Subscribe to payment.paid, payment.failed, payment_intent.succeeded, payment_intent.payment_failed. Copy the signing secret into PAYMONGO_WEBHOOK_SECRET.",
  },
  {
    n: "06",
    title: "Migrate the production database",
    body: "Run npm run db:migrate against your prod DATABASE_URL. The PayMongo migration adds User.paymongoIntentId, User.paymongoIntentExpires, and extends the PaymentProvider enum with PAYMONGO. Idempotent — safe to re-run.",
  },
  {
    n: "07",
    title: "Smoke test on live",
    body: "Click Pay via GCash · Operator on this billing page. Authorise in the GCash app. Within ~30s the webhook should land and your User row flips to OPERATOR with subscriptionStatus=active. Check WebhookEvent for the corresponding done row to prove idempotency claim worked.",
  },
];

/**
 * In-app, expandable PayMongo activation guide. Rendered on
 * /dashboard/billing when PAYMONGO_SECRET_KEY isn't configured.
 *
 * Two states:
 *   - `partial=false` (no PayMongo at all)         → full 7-step guide
 *   - `partial=true`  (key set but webhook missing) → focused webhook step
 */
export function PaymongoSetupGuide({ appUrl, partial }: PaymongoSetupGuideProps) {
  const [open, setOpen] = useState(!partial); // partial state opens to a shorter checklist
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/billing/paymongo/webhook`;

  return (
    <div className="border border-signal-cyan/30 bg-signal-cyan/[0.04]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center bg-signal-cyan font-mono text-[11px] font-bold text-void-0">
            PH
          </span>
          <div>
            <div className="font-display text-base tracking-wide text-signal-cyan">
              {partial
                ? "Finish PayMongo setup — add webhook secret"
                : "Attach your PayMongo account"}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
              {partial
                ? "almost there · webhook signature secret missing"
                : "GCash · Maya · GrabPay · cards · 14-day refund"}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-signal-cyan transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-5 border-t border-signal-cyan/20 px-4 py-4">
          <p className="text-sm leading-relaxed text-void-800">
            PayMongo is the Philippine payment rail. It covers GCash, Maya, GrabPay, BPI / BDO /
            UnionBank online + Visa / Mastercard / JCB / Amex (with 3-D Secure). Connect it once
            and the same checkout flow takes peso payments alongside Stripe&apos;s USD card flow.
          </p>

          <div className="border border-void-300/70 bg-void-0/40 p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
              Your webhook URL
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <code className="truncate font-mono text-[12px] text-signal-cyan">
                {webhookUrl}
              </code>
              <button
                type="button"
                onClick={() => copy(webhookUrl)}
                className="btn-ghost px-2 py-1"
                title="Copy to clipboard"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>

          <ol className="space-y-3">
            {STEPS.map((s) => (
              <li key={s.n} className="grid grid-cols-[auto_1fr] gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center border border-signal-cyan/40 font-mono text-[10px] text-signal-cyan">
                  {s.n}
                </span>
                <div>
                  <div className="font-display text-base leading-snug tracking-wide">
                    {s.title}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-void-700">{s.body}</p>
                  {s.tip && (
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-signal-amber">
                      tip · {s.tip}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div className="grid grid-cols-1 gap-3 border-t border-signal-cyan/20 pt-4 sm:grid-cols-2">
            <a
              href="https://dashboard.paymongo.com"
              target="_blank"
              rel="noreferrer"
              className="btn-primary justify-center"
            >
              <ExternalLink className="h-3 w-3" />
              Open PayMongo dashboard
            </a>
            <a
              href="https://developers.paymongo.com/reference/payment-intent-resource"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost justify-center"
            >
              <ExternalLink className="h-3 w-3" />
              API reference
            </a>
          </div>

          <div className="border border-void-300/70 bg-void-100/40 p-3 font-mono text-[10px] uppercase tracking-widest2 leading-relaxed text-void-700">
            <span className="text-signal-cyan">env vars</span> ·{" "}
            <span className="text-void-900">PAYMONGO_SECRET_KEY</span> = sk_live_… ·{" "}
            <span className="text-void-900">PAYMONGO_WEBHOOK_SECRET</span> = whsk_… ·{" "}
            <span className="text-void-900">NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY</span> = pk_live_…
          </div>
        </div>
      )}
    </div>
  );
}

function copy(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  void navigator.clipboard.writeText(text);
}
