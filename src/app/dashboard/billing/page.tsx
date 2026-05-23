import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import { Check } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { tryGetDb } from "@/lib/db";
import { env } from "@/lib/env";
import { PLANS } from "@/lib/billing/plans";
import { BillingClient } from "./BillingClient";
import type { Plan } from "@prisma/client";

const FREE_MONTHLY = 5;

interface BillingViewModel {
  plan: Plan;
  freeUsageMonth: number;
  planRenewsAt: Date | null;
  subscriptionStatus: string | null;
  history: Array<{
    d: string;
    desc: string;
    amt: string;
    status: string;
  }>;
}

async function loadBillingView(): Promise<BillingViewModel> {
  const user = await getSessionUser();
  const db = tryGetDb();

  // Demo defaults — match the original Phase 1 mock exactly so demo
  // visitors see the same page they used to.
  const demo: BillingViewModel = {
    plan: "RECON",
    freeUsageMonth: 3,
    planRenewsAt: null,
    subscriptionStatus: null,
    history: [
      { d: "01 May 2026", amt: "$0.00", desc: "Recon · free", status: "—" },
      { d: "01 Apr 2026", amt: "$0.00", desc: "Recon · free", status: "—" },
      { d: "01 Mar 2026", amt: "$0.00", desc: "Recon · free", status: "—" },
    ],
  };
  if (!user || user.isDemo || !db) return demo;

  const row = await db.user.findUnique({
    where: { id: user.id },
    select: {
      plan: true,
      freeUsageMonth: true,
      planRenewsAt: true,
      subscriptionStatus: true,
    },
  });
  if (!row) return demo;

  const payments = await db.payment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      createdAt: true,
      amountCents: true,
      currency: true,
      description: true,
      status: true,
    },
  });

  return {
    plan: row.plan,
    freeUsageMonth: row.freeUsageMonth,
    planRenewsAt: row.planRenewsAt,
    subscriptionStatus: row.subscriptionStatus,
    history: payments.map((p) => ({
      d: p.createdAt.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      desc: p.description ?? "Subscription",
      amt: `${p.currency} ${(p.amountCents / 100).toFixed(2)}`,
      status: p.status,
    })),
  };
}

export default async function BillingPage() {
  const view = await loadBillingView();
  const planDef = PLANS[view.plan];
  const isFree = view.plan === "RECON";

  return (
    <>
      <Topbar
        title="Billing"
        sub={env.stripe.enabled ? "Stripe · live" : "Stripe · demo (set STRIPE_SECRET_KEY)"}
      />

      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <Panel title="Current plan" meta={planDef.name}>
          <div className="grid grid-cols-1 gap-px bg-void-300/60 sm:grid-cols-3">
            <div className="bg-void-50/60 p-6">
              <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                Tier
              </div>
              <div className="mt-2 font-display text-4xl tracking-wide">{planDef.name}</div>
              <div className="mt-1 font-mono text-[11px] text-void-700">
                {isFree ? "Free · forever" : `$${planDef.priceUsd} / month`}
              </div>
              {view.subscriptionStatus && view.subscriptionStatus !== "active" && (
                <div className="mt-3 chip border-signal-amber/40 text-signal-amber">
                  {view.subscriptionStatus}
                </div>
              )}
            </div>
            <div className="bg-void-50/60 p-6">
              <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                Usage · this month
              </div>
              {isFree ? (
                <>
                  <div className="mt-2 font-display text-4xl tracking-wide text-signal-amber">
                    {view.freeUsageMonth} / {FREE_MONTHLY}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-void-700">autopsies used</div>
                  <div className="mt-3 h-1.5 w-full bg-void-300/60">
                    <div
                      className="h-full bg-signal-amber transition-all"
                      style={{
                        width: `${Math.min(100, (view.freeUsageMonth / FREE_MONTHLY) * 100)}%`,
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-2 font-display text-4xl tracking-wide text-signal-green">
                    Unlimited
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-void-700">autopsies / month</div>
                </>
              )}
            </div>
            <div className="bg-void-50/60 p-6">
              <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                Renews
              </div>
              <div className="mt-2 font-display text-4xl tracking-wide">
                {view.planRenewsAt
                  ? view.planRenewsAt.toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "—"}
              </div>
              <div className="mt-1 font-mono text-[11px] text-void-700">
                {view.planRenewsAt
                  ? view.planRenewsAt.toLocaleDateString("en-US", { year: "numeric" })
                  : "Free plan"}
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title={isFree ? "Upgrade" : "Manage plan"}
          meta="Stripe Checkout · cancel anytime"
        >
          <div className="grid grid-cols-1 gap-px bg-void-300/60 lg:grid-cols-2">
            <PlanCard plan="OPERATOR" highlight={view.plan !== "OPERATOR"} />
            <PlanCard plan="DESK" highlight={false} />
          </div>

          <div className="mt-6">
            <BillingClient currentPlan={view.plan} stripeEnabled={env.stripe.enabled} />
          </div>
        </Panel>

        <Panel title="History" meta={`${view.history.length} entries`}>
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
              {view.history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-void-700">
                    No payments yet
                  </td>
                </tr>
              ) : (
                view.history.map((h, i) => (
                  <tr key={i} className="border-b border-void-300/40">
                    <td className="py-3 text-void-700">{h.d}</td>
                    <td className="py-3 text-void-900">{h.desc}</td>
                    <td className="py-3 text-void-900">{h.amt}</td>
                    <td className="py-3 text-void-700">{h.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}

function PlanCard({ plan, highlight }: { plan: Plan; highlight: boolean }) {
  const def = PLANS[plan];
  const checkColor = highlight ? "text-signal-green" : "text-signal-cyan";
  return (
    <div className="bg-void-50/60 p-6">
      <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
        {def.name} {highlight ? "· most picked" : "· teams + prop"}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span
          className={`font-display text-6xl tracking-wide ${
            highlight ? "text-signal-green" : "text-void-900"
          }`}
        >
          ${def.priceUsd}
        </span>
        <span className="font-mono text-[11px] text-void-700">/ month</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {def.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-void-800">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${checkColor}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
