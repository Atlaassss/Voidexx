"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Plan } from "@prisma/client";

interface BillingClientProps {
  /** Current plan (real, from DB when configured; "RECON" in demo mode). */
  currentPlan: Plan;
  /** True when STRIPE_SECRET_KEY is configured server-side. */
  stripeEnabled: boolean;
}

/**
 * Client-side button handlers for the billing page. The page itself is
 * a server component (reads the session + plan); the upgrade buttons
 * live here so we can hit /api/billing/checkout on click and redirect
 * to Stripe-hosted checkout.
 */
export function BillingClient({ currentPlan, stripeEnabled }: BillingClientProps) {
  const [busy, setBusy] = useState<Plan | "PORTAL" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: Plan) {
    if (!stripeEnabled) {
      setError(
        "Billing is in demo mode. Set STRIPE_SECRET_KEY + STRIPE_PRICE_OPERATOR + STRIPE_PRICE_DESK to enable real checkout.",
      );
      return;
    }
    setError(null);
    setBusy(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "checkout_failed");
      // Top-level navigation, not a fetch — Stripe checkout is its own page.
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
      setBusy(null);
    }
  }

  async function openPortal() {
    if (!stripeEnabled) {
      setError("Billing portal not available in demo mode.");
      return;
    }
    setError(null);
    setBusy("PORTAL");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "portal_failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
      setBusy(null);
    }
  }

  const hasPaid = currentPlan === "OPERATOR" || currentPlan === "DESK";

  return (
    <div className="space-y-3">
      {error && (
        <div className="border border-signal-red/40 bg-signal-red/[0.06] p-3 font-mono text-[11px] text-signal-red">
          {error}
        </div>
      )}

      {hasPaid && (
        <button
          onClick={openPortal}
          disabled={busy !== null}
          className="btn-ghost w-full justify-center disabled:opacity-50"
        >
          {busy === "PORTAL" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : null}
          Manage subscription →
        </button>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <UpgradeButton
          plan="OPERATOR"
          label={currentPlan === "OPERATOR" ? "Current plan" : "Upgrade to Operator"}
          variant="primary"
          disabled={busy !== null || currentPlan === "OPERATOR"}
          loading={busy === "OPERATOR"}
          onClick={() => startCheckout("OPERATOR")}
        />
        <UpgradeButton
          plan="DESK"
          label={
            currentPlan === "DESK"
              ? "Current plan"
              : currentPlan === "OPERATOR"
                ? "Upgrade to Desk"
                : "Open desk"
          }
          variant="ghost"
          disabled={busy !== null || currentPlan === "DESK"}
          loading={busy === "DESK"}
          onClick={() => startCheckout("DESK")}
        />
      </div>
    </div>
  );
}

function UpgradeButton({
  label,
  variant,
  disabled,
  loading,
  onClick,
}: {
  plan: Plan;
  label: string;
  variant: "primary" | "ghost";
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const cls = variant === "primary" ? "btn-primary" : "btn-ghost";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${cls} w-full justify-center disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {label}
    </button>
  );
}
