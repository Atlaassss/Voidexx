import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import { Check } from "lucide-react";

const HISTORY = [
  { d: "01 May 2026", amt: "$0.00", desc: "Recon · free", status: "—" },
  { d: "01 Apr 2026", amt: "$0.00", desc: "Recon · free", status: "—" },
  { d: "01 Mar 2026", amt: "$0.00", desc: "Recon · free", status: "—" },
];

export default function BillingPage() {
  return (
    <>
      <Topbar title="Billing" sub="plan · payments · invoices" />

      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <Panel title="Current plan" meta="Recon">
          <div className="grid grid-cols-1 gap-px bg-void-300/60 sm:grid-cols-3">
            <div className="bg-void-50/60 p-6">
              <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                Tier
              </div>
              <div className="mt-2 font-display text-4xl tracking-wide">Recon</div>
              <div className="mt-1 font-mono text-[11px] text-void-700">Free · forever</div>
            </div>
            <div className="bg-void-50/60 p-6">
              <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                Usage · this month
              </div>
              <div className="mt-2 font-display text-4xl tracking-wide text-signal-amber">3 / 5</div>
              <div className="mt-1 font-mono text-[11px] text-void-700">autopsies used</div>
              <div className="mt-3 h-1.5 w-full bg-void-300/60">
                <div className="h-full bg-signal-amber" style={{ width: "60%" }} />
              </div>
            </div>
            <div className="bg-void-50/60 p-6">
              <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                Renews
              </div>
              <div className="mt-2 font-display text-4xl tracking-wide">—</div>
              <div className="mt-1 font-mono text-[11px] text-void-700">Free plan</div>
            </div>
          </div>
        </Panel>

        <Panel title="Upgrade" meta="Stripe · PayPal · GCash · Maya">
          <div className="grid grid-cols-1 gap-px bg-void-300/60 lg:grid-cols-2">
            <div className="bg-void-50/60 p-6">
              <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                Operator · most picked
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-6xl tracking-wide text-signal-green">$24</span>
                <span className="font-mono text-[11px] text-void-700">/ month</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  "Unlimited autopsies",
                  "Smart-money decoder",
                  "Psychology + tilt guard",
                  "1 venue automation",
                  "Zero ads",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-void-800">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal-green" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button className="btn-primary mt-6 w-full justify-center">Upgrade to Operator</button>
            </div>
            <div className="bg-void-50/60 p-6">
              <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                Desk · teams + prop
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-6xl tracking-wide">$79</span>
                <span className="font-mono text-[11px] text-void-700">/ month</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  "Everything in Operator",
                  "5 seats · team dashboard",
                  "API + webhooks",
                  "Prop-firm constraint engine",
                  "Dedicated AI mentor",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-void-800">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal-cyan" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button className="btn-ghost mt-6 w-full justify-center">Open desk</button>
            </div>
          </div>
        </Panel>

        <Panel title="History">
          <table className="w-full font-mono text-[12px]">
            <thead>
              <tr className="border-b border-void-300/70 text-left text-[10px] uppercase tracking-widest2 text-void-700">
                <th className="py-2">Date</th>
                <th className="py-2">Description</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {HISTORY.map((h, i) => (
                <tr key={i} className="border-b border-void-300/40">
                  <td className="py-3 text-void-700">{h.d}</td>
                  <td className="py-3 text-void-900">{h.desc}</td>
                  <td className="py-3 text-void-900">{h.amt}</td>
                  <td className="py-3 text-void-700">{h.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}
