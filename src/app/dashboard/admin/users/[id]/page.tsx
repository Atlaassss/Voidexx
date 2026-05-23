import { Topbar } from "@/components/dash/Topbar";
import { Panel } from "@/components/dash/Panel";
import { requireAdmin } from "@/lib/admin";
import { tryGetDb } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { UserDetailClient, type UserDetail } from "./UserDetailClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * /dashboard/admin/users/[id]
 *
 * Server-rendered admin detail panel. Renders user identity + 90-day
 * payments + recent autopsies + audit log in one shot. Action buttons
 * (plan change, bonus grant, suspend) live in <UserDetailClient />.
 *
 * Demo mode: shows a deterministic mock so the UI stays clickable.
 */
export default async function AdminUserDetailPage({ params }: PageProps) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/dashboard");
  }

  const { id } = await params;
  const db = tryGetDb();

  // Fetch directly from DB on the server to avoid a client-side
  // round-trip + auth re-check. Falls through to demo mocks if no DB.
  let detail: UserDetail | null = null;

  if (db && !admin.isDemo) {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        plan: true,
        planRenewsAt: true,
        subscriptionStatus: true,
        freeUsageMonth: true,
        bonusAutopsies: true,
        suspendedAt: true,
        suspendedReason: true,
        stripeCustomerId: true,
        paymongoIntentId: true,
        referralCode: true,
        createdAt: true,
      },
    });
    if (!user) notFound();

    const [payments, autopsies, audit] = await Promise.all([
      db.payment.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.autopsy.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { trade: { select: { symbol: true, timeframe: true, direction: true } } },
      }),
      db.adminAuditLog.findMany({
        where: { OR: [{ targetType: "User", targetId: id }, { actorId: id }] },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    detail = {
      user: {
        ...user,
        planRenewsAt: user.planRenewsAt?.toISOString() ?? null,
        suspendedAt: user.suspendedAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      },
      payments: payments.map((p) => ({
        id: p.id,
        provider: p.provider,
        providerRef: p.providerRef,
        amountCents: p.amountCents,
        currency: p.currency,
        status: p.status,
        description: p.description,
        createdAt: p.createdAt.toISOString(),
      })),
      autopsies: autopsies.map((a) => ({
        id: a.id,
        score: a.score,
        verdict: a.verdict,
        flags: a.flags,
        createdAt: a.createdAt.toISOString(),
        trade: a.trade,
      })),
      audit: audit.map((a) => ({
        id: a.id,
        actorId: a.actorId,
        action: a.action,
        meta: (a.meta as Record<string, unknown> | null) ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  } else {
    // Demo fallback — same shape as live, deterministic content.
    detail = demoDetail(id);
  }

  return (
    <>
      <Topbar
        title={detail.user.displayName ?? detail.user.email}
        sub={`admin · ${detail.user.email}`}
      />
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/admin"
            className="font-mono text-[11px] uppercase tracking-widest2 text-void-700 transition hover:text-signal-cyan"
          >
            <ArrowLeft className="mr-1 inline h-3 w-3" />
            back to all users
          </Link>
          {detail.user.suspendedAt && (
            <div className="inline-flex items-center gap-2 border border-signal-red/40 bg-signal-red/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-widest2 text-signal-red">
              <ShieldAlert className="h-3 w-3" />
              Suspended · {detail.user.suspendedReason ?? "no reason"}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Left: identity + actions */}
          <div className="space-y-6 xl:col-span-1">
            <UserDetailClient detail={detail} />
          </div>

          {/* Right: lifecycle data */}
          <div className="space-y-6 xl:col-span-2">
            <Panel title="Recent payments" meta={`${detail.payments.length} entries`}>
              {detail.payments.length === 0 ? (
                <p className="py-6 text-center font-mono text-[11px] text-void-700">
                  No payments yet.
                </p>
              ) : (
                <table className="w-full font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-void-300/70 text-left uppercase tracking-widest2 text-void-700">
                      <th className="px-2 py-2 font-normal">Date</th>
                      <th className="px-2 py-2 font-normal">Provider</th>
                      <th className="px-2 py-2 font-normal">Description</th>
                      <th className="px-2 py-2 text-right font-normal">Amount</th>
                      <th className="px-2 py-2 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.payments.map((p) => (
                      <tr key={p.id} className="border-b border-void-300/40">
                        <td className="px-2 py-2 text-void-700">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-2 py-2 text-signal-cyan">{p.provider}</td>
                        <td className="px-2 py-2 text-void-800">{p.description}</td>
                        <td className="px-2 py-2 text-right text-void-900">
                          {p.currency} {(p.amountCents / 100).toFixed(2)}
                        </td>
                        <td
                          className={`px-2 py-2 ${
                            p.status === "PAID"
                              ? "text-signal-green"
                              : p.status === "FAILED"
                                ? "text-signal-red"
                                : "text-void-700"
                          }`}
                        >
                          {p.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel title="Recent autopsies" meta={`${detail.autopsies.length} entries`}>
              {detail.autopsies.length === 0 ? (
                <p className="py-6 text-center font-mono text-[11px] text-void-700">
                  No autopsies yet.
                </p>
              ) : (
                <ul className="divide-y divide-void-300/60">
                  {detail.autopsies.map((a) => (
                    <li
                      key={a.id}
                      className="grid grid-cols-12 items-center gap-3 py-3"
                    >
                      <span className="col-span-2 font-mono text-[10px] text-void-700">
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                      <span className="col-span-2 font-display text-base tracking-wide">
                        {a.trade.symbol}
                      </span>
                      <span className="col-span-1 font-mono text-[10px] text-void-700">
                        {a.trade.timeframe}
                      </span>
                      <span
                        className={`col-span-1 font-mono text-[10px] uppercase tracking-widest2 ${
                          a.trade.direction === "LONG"
                            ? "text-signal-green"
                            : "text-signal-red"
                        }`}
                      >
                        {a.trade.direction}
                      </span>
                      <span className="col-span-5 truncate text-[12px] text-void-800">
                        {a.verdict}
                      </span>
                      <span
                        className={`col-span-1 text-right font-display text-2xl ${
                          a.score >= 75
                            ? "text-signal-green"
                            : a.score >= 50
                              ? "text-signal-amber"
                              : "text-signal-red"
                        }`}
                      >
                        {a.score}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Audit trail" meta={`${detail.audit.length} entries`}>
              {detail.audit.length === 0 ? (
                <p className="py-6 text-center font-mono text-[11px] text-void-700">
                  No audit entries.
                </p>
              ) : (
                <ul className="space-y-2">
                  {detail.audit.map((a) => (
                    <li
                      key={a.id}
                      className="border border-void-300/60 bg-void-100/40 p-3 font-mono text-[11px]"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-signal-cyan">{a.action}</span>
                        <span className="text-void-700">
                          {new Date(a.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-void-700">
                        actor: {a.actorId}
                      </div>
                      {a.meta && (
                        <pre className="mt-2 max-h-24 overflow-hidden whitespace-pre-wrap text-[10px] text-void-700">
                          {JSON.stringify(a.meta, null, 2)}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}

function demoDetail(id: string): UserDetail {
  return {
    user: {
      id,
      email: `${id}@voidexx.demo`,
      username: id.slice(0, 8),
      displayName: "Demo User",
      role: "USER",
      plan: "RECON",
      planRenewsAt: null,
      subscriptionStatus: null,
      freeUsageMonth: 3,
      bonusAutopsies: 0,
      suspendedAt: null,
      suspendedReason: null,
      stripeCustomerId: null,
      paymongoIntentId: null,
      referralCode: "DEMO" + id.slice(0, 4).toUpperCase(),
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
    payments: [
      {
        id: "pay_demo_1",
        provider: "STRIPE",
        providerRef: "ch_demo_1",
        amountCents: 2400,
        currency: "USD",
        status: "PAID",
        description: "Operator · monthly",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    autopsies: [
      {
        id: "ap_demo_1",
        score: 38,
        verdict: "Liquidity-trap entry above session high.",
        flags: ["revenge", "premium_short", "liquidity_grab"],
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        trade: { symbol: "BTCUSDT", timeframe: "1H", direction: "SHORT" },
      },
      {
        id: "ap_demo_2",
        score: 91,
        verdict: "Clean OB retest after London-low sweep.",
        flags: ["patient_entry", "confluence"],
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        trade: { symbol: "EURUSD", timeframe: "15M", direction: "LONG" },
      },
    ],
    audit: [
      {
        id: "al_demo_1",
        actorId: "admin_demo",
        action: "user.bonus_granted",
        meta: { grantDelta: 5 },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "al_demo_2",
        actorId: id,
        action: "self.signin",
        meta: null,
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    ],
  };
}
