"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Minus, ShieldOff, Shield, X } from "lucide-react";
import { Panel } from "@/components/dash/Panel";
import { toast } from "@/lib/toast";

export interface UserDetail {
  user: {
    id: string;
    email: string;
    username: string | null;
    displayName: string | null;
    role: string;
    plan: string;
    planRenewsAt: string | null;
    subscriptionStatus: string | null;
    freeUsageMonth: number;
    bonusAutopsies: number;
    suspendedAt: string | null;
    suspendedReason: string | null;
    stripeCustomerId: string | null;
    paymongoIntentId: string | null;
    referralCode: string | null;
    createdAt: string;
  };
  payments: Array<{
    id: string;
    provider: string;
    providerRef: string;
    amountCents: number;
    currency: string;
    status: string;
    description: string | null;
    createdAt: string;
  }>;
  autopsies: Array<{
    id: string;
    score: number;
    verdict: string;
    flags: unknown;
    createdAt: string;
    trade: { symbol: string; timeframe: string; direction: string };
  }>;
  audit: Array<{
    id: string;
    actorId: string;
    action: string;
    meta: Record<string, unknown> | null;
    createdAt: string;
  }>;
}

/**
 * Client-side controls for the admin user-detail panel.
 *
 * Surfaces three Phase 8 admin actions:
 *
 *   1. Plan change — RECON / OPERATOR / DESK. Doesn't trigger
 *      Stripe / PayMongo, just flips the local plan flag. Use case:
 *      gifting a paid plan, downgrading after refund, etc.
 *
 *   2. Bonus autopsies — relative grant (+1 / +5 / +10 / -1 / -all).
 *      Bumps the user's bonusAutopsies counter, audit-logged with the
 *      delta. The quota check subtracts these from freeUsageMonth
 *      before deciding "over limit" (Phase 8 quota update — TODO).
 *
 *   3. Suspend / unsuspend — soft-suspends the account. User is
 *      logged out everywhere on next request and refused at every
 *      authed route until lifted.
 *
 * Every successful PATCH refreshes the server component so the page
 * reflects the new state without a full reload.
 */
export function UserDetailClient({ detail: initial }: { detail: UserDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState(initial.user);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [, startTransition] = useTransition();

  const u = optimistic;
  const suspended = Boolean(u.suspendedAt);

  async function patch(label: string, body: unknown) {
    setBusy(label);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "patch_failed");

      if (data.demo) {
        toast.demo(`${label} — demo mode`, "Set DATABASE_URL to persist real changes.");
      } else {
        toast.success(label, "Change persisted + audit-logged.");
        if (data.user) {
          setOptimistic((u) => ({
            ...u,
            ...data.user,
            suspendedAt: data.user.suspendedAt ?? null,
          }));
        }
        startTransition(() => router.refresh());
      }
    } catch (e) {
      toast.error(`${label} failed`, e instanceof Error ? e.message : "unknown error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Panel title="Identity">
        <Field label="Display" value={u.displayName ?? "—"} />
        <Field label="Username" value={u.username ?? "—"} />
        <Field label="Email" value={u.email} />
        <Field label="User ID" value={u.id} mono />
        <Field
          label="Joined"
          value={new Date(u.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          })}
        />
        <Field
          label="Referral code"
          value={u.referralCode ?? "—"}
          mono
        />
      </Panel>

      <Panel title="Plan">
        <Field label="Current plan" value={u.plan} tone="green" />
        <Field
          label="Status"
          value={u.subscriptionStatus ?? "free"}
          tone={u.subscriptionStatus === "active" ? "green" : undefined}
        />
        <Field
          label="Renews"
          value={
            u.planRenewsAt
              ? new Date(u.planRenewsAt).toLocaleDateString()
              : "—"
          }
        />
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {(["RECON", "OPERATOR", "DESK"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => patch(`Plan → ${p}`, { plan: p })}
              disabled={busy !== null || u.plan === p}
              className={`border px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest2 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                u.plan === p
                  ? "border-signal-green/60 bg-signal-green/[0.10] text-signal-green"
                  : "border-void-300/70 text-void-700 hover:border-signal-cyan/40 hover:text-signal-cyan"
              }`}
            >
              {busy === `Plan → ${p}` ? <Loader2 className="mx-auto h-3 w-3 animate-spin" /> : p}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Quota">
        <Field label="Free this month" value={`${u.freeUsageMonth} / 5`} />
        <Field label="Bonus autopsies" value={String(u.bonusAutopsies)} tone={u.bonusAutopsies > 0 ? "green" : undefined} />
        <div className="mt-3">
          <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            Grant bonus
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1">
            {[+1, +5, +10, -1, -u.bonusAutopsies].map((delta, i) => {
              if (i === 4 && u.bonusAutopsies === 0) return null;
              const label =
                i === 4 ? "clear" : delta > 0 ? `+${delta}` : `${delta}`;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => patch(`Bonus ${label}`, { grantBonus: delta })}
                  disabled={busy !== null}
                  className="border border-void-300/70 px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest2 text-void-700 transition hover:border-signal-cyan/40 hover:text-signal-cyan disabled:opacity-50"
                >
                  {busy === `Bonus ${label}` ? (
                    <Loader2 className="mx-auto h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      {delta > 0 ? <Plus className="inline h-3 w-3" /> : <Minus className="inline h-3 w-3" />}
                      {label.replace(/^[+-]/, "")}
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            Audit-logged. Decremented before freeUsageMonth in quota check.
          </p>
        </div>
      </Panel>

      <Panel title="Account state">
        {suspended ? (
          <>
            <Field
              label="Suspended"
              value={u.suspendedAt ? new Date(u.suspendedAt).toLocaleString() : "—"}
              tone="red"
            />
            <Field label="Reason" value={u.suspendedReason ?? "—"} tone="red" />
            <button
              type="button"
              onClick={() => patch("Unsuspend", { suspend: null })}
              disabled={busy !== null}
              className="btn-ghost mt-3 w-full justify-center disabled:opacity-50"
            >
              {busy === "Unsuspend" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
              Lift suspension
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-void-800">
              Suspending will log this user out everywhere and refuse them at
              every authed route until lifted. Reversible.
            </p>
            <button
              type="button"
              onClick={() => setSuspendOpen(true)}
              disabled={busy !== null}
              className="btn-ghost mt-3 w-full justify-center border-signal-red/60 text-signal-red hover:border-signal-red"
            >
              <ShieldOff className="h-3 w-3" />
              Suspend account
            </button>
          </>
        )}

        {u.role !== "USER" && (
          <Field label="Role" value={u.role} tone="red" />
        )}
      </Panel>

      {suspendOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-void-0/80 p-4 backdrop-blur-sm"
          onClick={() => setSuspendOpen(false)}
        >
          <SuspendDialog
            onClose={() => setSuspendOpen(false)}
            onSubmit={async (reason) => {
              setSuspendOpen(false);
              await patch("Suspend", { suspend: { reason } });
            }}
          />
        </div>
      )}
    </>
  );
}

function Field({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: "green" | "red";
  mono?: boolean;
}) {
  const cls =
    tone === "red"
      ? "text-signal-red"
      : tone === "green"
        ? "text-signal-green"
        : "text-void-900";
  return (
    <div className="flex items-center justify-between border-b border-dashed border-void-300/60 py-2">
      <span className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
        {label}
      </span>
      <span
        className={`max-w-[60%] truncate ${mono ? "font-mono text-[11px]" : "text-[12px]"} ${cls}`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function SuspendDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <form
      onClick={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(reason.trim() || "no reason given");
      }}
      className="brackets cell relative w-full max-w-md p-6"
    >
      <span className="b1" />
      <span className="b2" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 text-void-700 hover:text-signal-red"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="font-mono text-[10px] uppercase tracking-widest3 text-signal-red">
        // suspend account
      </div>
      <h2 className="display-crush mt-2 text-3xl">Reason</h2>
      <p className="mt-2 text-sm text-void-700">
        Stamped on the audit log. Visible to other admins reviewing this
        account later. Keep it short and specific.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Stripe disputed $79 charge — see ticket #123"
        rows={3}
        maxLength={500}
        className="mt-4 w-full border border-void-300/70 bg-void-100/40 p-3 font-mono text-[12px] text-void-900 focus:border-signal-red focus:outline-none"
      />
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary flex-1 justify-center border-signal-red bg-signal-red text-void-0 hover:bg-signal-red/80"
        >
          <ShieldOff className="h-3 w-3" />
          Suspend
        </button>
      </div>
    </form>
  );
}
