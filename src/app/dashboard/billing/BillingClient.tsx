"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Plan } from "@prisma/client";

interface BillingClientProps {
  /** Current plan (real, from DB when configured; "RECON" in demo mode). */
  currentPlan: Plan;
  /** True when STRIPE_SECRET_KEY is configured server-side. */
  stripeEnabled: boolean;
  /** True when PAYMONGO_SECRET_KEY is configured server-side. */
  paymongoEnabled: boolean;
}

type PaymongoMethodPick = "gcash" | "paymaya" | "grab_pay";

const PAYMONGO_METHODS: Array<{ id: PaymongoMethodPick; label: string; tone: string }> = [
  { id: "gcash", label: "GCash", tone: "border-signal-cyan/60 text-signal-cyan" },
  { id: "paymaya", label: "Maya", tone: "border-signal-green/60 text-signal-green" },
  { id: "grab_pay", label: "GrabPay", tone: "border-signal-amber/60 text-signal-amber" },
];

/**
 * Client-side button handlers for the billing page. The page itself is
 * a server component (reads the session + plan); the upgrade buttons
 * live here so we can hit /api/billing/checkout on click and redirect
 * to the appropriate hosted-payment URL (Stripe or PayMongo).
 *
 * UI shape:
 *   - When Stripe is enabled: top-row "Pay with card (Stripe)" buttons
 *     for each paid plan, navigating to Stripe Checkout.
 *   - When PayMongo is enabled: chip selector for GCash/Maya/GrabPay,
 *     then per-plan "Pay ₱X via <method>" buttons.
 *   - When BOTH are enabled: both surfaces stack — user picks the rail.
 *   - When neither is enabled: an inline demo notice instead.
 */
export function BillingClient({
  currentPlan,
  stripeEnabled,
  paymongoEnabled,
}: BillingClientProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymongoMethod, setPaymongoMethod] = useState<PaymongoMethodPick>("gcash");

  const noRail = !stripeEnabled && !paymongoEnabled;

  async function startStripe(plan: Plan) {
    if (!stripeEnabled) {
      setError("Stripe is not configured. Set STRIPE_SECRET_KEY + STRIPE_PRICE_OPERATOR + STRIPE_PRICE_DESK.");
      return;
    }
    setError(null);
    setBusy(`stripe:${plan}`);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, provider: "stripe" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "checkout_failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
      setBusy(null);
    }
  }

  async function startPaymongo(plan: Plan) {
    if (!paymongoEnabled) {
      setError("PayMongo is not configured. Set PAYMONGO_SECRET_KEY + PAYMONGO_PRICE_*_PHP.");
      return;
    }
    setError(null);
    setBusy(`paymongo:${plan}:${paymongoMethod}`);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan,
          provider: "paymongo",
          method: paymongoMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "checkout_failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
      setBusy(null);
    }
  }

  async function openPortal() {
    if (!stripeEnabled) {
      setError("Stripe portal not available — set STRIPE_SECRET_KEY first.");
      return;
    }
    setError(null);
    setBusy("portal");
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
    <div className="space-y-4">
      {error && (
        <div className="border border-signal-red/40 bg-signal-red/[0.06] p-3 font-mono text-[11px] text-signal-red">
          {error}
        </div>
      )}

      {hasPaid && stripeEnabled && (
        <button
          onClick={openPortal}
          disabled={busy !== null}
          className="btn-ghost w-full justify-center disabled:opacity-50"
        >
          {busy === "portal" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Manage subscription →
        </button>
      )}

      {noRail && (
        <div className="border border-signal-amber/40 bg-signal-amber/[0.06] p-4 font-mono text-[11px] text-signal-amber">
          Billing is in demo mode. Set <span className="text-signal-cyan">STRIPE_SECRET_KEY</span>{" "}
          (global) or <span className="text-signal-cyan">PAYMONGO_SECRET_KEY</span> (Philippines) to
          enable real checkout.
        </div>
      )}

      {/* --- Stripe rail (global / USD) --- */}
      {stripeEnabled && (
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            Pay with card · Stripe · USD
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UpgradeButton
              label={currentPlan === "OPERATOR" ? "Current plan" : "Upgrade · Operator"}
              variant="primary"
              disabled={busy !== null || currentPlan === "OPERATOR"}
              loading={busy === "stripe:OPERATOR"}
              onClick={() => startStripe("OPERATOR")}
            />
            <UpgradeButton
              label={
                currentPlan === "DESK"
                  ? "Current plan"
                  : currentPlan === "OPERATOR"
                    ? "Upgrade · Desk"
                    : "Open desk"
              }
              variant="ghost"
              disabled={busy !== null || currentPlan === "DESK"}
              loading={busy === "stripe:DESK"}
              onClick={() => startStripe("DESK")}
            />
          </div>
        </div>
      )}

      {/* --- PayMongo rail (PH / PHP) --- */}
      {paymongoEnabled && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
              Pay locally · PayMongo · PHP
            </div>
            <div className="flex gap-1">
              {PAYMONGO_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymongoMethod(m.id)}
                  disabled={busy !== null}
                  className={`chip ${
                    paymongoMethod === m.id
                      ? m.tone
                      : "border-void-300/60 text-void-700 hover:border-void-400"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UpgradeButton
              label={
                currentPlan === "OPERATOR"
                  ? "Current plan"
                  : `Pay via ${labelFor(paymongoMethod)} · Operator`
              }
              variant="primary"
              disabled={busy !== null || currentPlan === "OPERATOR"}
              loading={busy === `paymongo:OPERATOR:${paymongoMethod}`}
              onClick={() => startPaymongo("OPERATOR")}
            />
            <UpgradeButton
              label={
                currentPlan === "DESK"
                  ? "Current plan"
                  : `Pay via ${labelFor(paymongoMethod)} · Desk`
              }
              variant="ghost"
              disabled={busy !== null || currentPlan === "DESK"}
              loading={busy === `paymongo:DESK:${paymongoMethod}`}
              onClick={() => startPaymongo("DESK")}
            />
          </div>
        </div>
      )}
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

function labelFor(m: PaymongoMethodPick): string {
  return m === "gcash" ? "GCash" : m === "paymaya" ? "Maya" : "GrabPay";
}
