/**
 * Plan SSOT.
 *
 * One place to define plan id, display name, monthly price, feature
 * bullets, and the Stripe price id env binding. Every other piece of
 * billing UI / logic reads from here so prices & features can't drift.
 *
 * Phase 7.1 adds the PHP-denominated price for the PayMongo rail. We
 * publish a flat conversion (USD × 56) so ops don't have to maintain
 * two source-of-truth lists; if the FX rate drifts more than a few
 * percent, override via PAYMONGO_PRICE_*_PHP env vars.
 *
 * Phase 9 introduces a launch-discount pricing layout: paid tiers
 * advertise the strikethrough `originalPriceUsd` alongside the live
 * price so the marketing surface and billing dashboard render the
 * same "price was $X, now $Y" treatment without data drift.
 */

import { env } from "../env";
import type { Plan } from "@prisma/client";

export interface PlanDef {
  id: Plan;
  /** Marketing display name. */
  name: string;
  /**
   * USD per month for paid tiers, 0 for free. May be a decimal — the
   * launch-discount rollout uses prices like $15.88 / $24.88.
   */
  priceUsd: number;
  /**
   * Pre-discount USD price. Render with a strikethrough above
   * `priceUsd` and a "Save NN%" badge. Set to `null` for the free
   * tier and any tier with no advertised discount.
   */
  originalPriceUsd: number | null;
  /** PHP per month for paid tiers, 0 for free. Centavos × 100 lives in the env override. */
  pricePhp: number;
  /** Pre-discount PHP price for the strikethrough render. `null` when no discount. */
  originalPricePhp: number | null;
  /** Short marketing line. */
  blurb: string;
  /** Feature bullets shown on /dashboard/billing. */
  features: string[];
  /** Stripe Price ID. Null for the free tier. */
  stripePriceId: string | undefined;
  /**
   * PayMongo price in centavos. Either the env override (string) or the
   * `pricePhp * 100` fallback. Null for the free tier.
   */
  paymongoCentavos: number | undefined;
}

/** Best-effort USD→PHP conversion. Override per-plan via env. */
const USD_TO_PHP = 56;

function paymongoCentavosFor(plan: "OPERATOR" | "DESK", priceUsd: number): number {
  const envOverride =
    plan === "OPERATOR" ? env.paymongo.priceOperatorPhp : env.paymongo.priceDeskPhp;
  if (envOverride) {
    const parsed = Number.parseInt(envOverride, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  // priceUsd may be a decimal (e.g. 15.88). Multiply through to centavos
  // and round so we never send a non-integer to PayMongo (their API
  // returns 400 on fractional centavo amounts).
  return Math.round(priceUsd * USD_TO_PHP * 100); // PHP → centavos
}

// Live launch-discount prices. Free stays free; paid tiers price
// below psychological round numbers so the strikethrough originals
// sell the saving without being unbelievably steep.
const operatorUsd = 15.88;
const operatorOriginalUsd = 29;
const deskUsd = 24.88;
const deskOriginalUsd = 49;

export const PLANS: Record<Plan, PlanDef> = {
  RECON: {
    id: "RECON",
    name: "Recon",
    priceUsd: 0,
    originalPriceUsd: null,
    pricePhp: 0,
    originalPricePhp: null,
    blurb: "Run autopsies. Get a feel.",
    features: [
      "5 trade autopsies / month",
      "Basic structural read",
      "Auto journal (limited)",
      "Global market news (delayed)",
      "Ads enabled",
    ],
    stripePriceId: undefined,
    paymongoCentavos: undefined,
  },
  OPERATOR: {
    id: "OPERATOR",
    name: "Operator",
    priceUsd: operatorUsd,
    originalPriceUsd: operatorOriginalUsd,
    pricePhp: Math.round(operatorUsd * USD_TO_PHP),
    originalPricePhp: Math.round(operatorOriginalUsd * USD_TO_PHP),
    blurb: "For active retail traders.",
    features: [
      "Unlimited autopsies",
      "Smart-money decoder",
      "Psychology + tilt guard",
      "Live global news (X · TV · wires)",
      "Priority queue · zero ads",
    ],
    stripePriceId: env.stripe.priceOperator,
    paymongoCentavos: paymongoCentavosFor("OPERATOR", operatorUsd),
  },
  DESK: {
    id: "DESK",
    name: "Desk",
    priceUsd: deskUsd,
    originalPriceUsd: deskOriginalUsd,
    pricePhp: Math.round(deskUsd * USD_TO_PHP),
    originalPricePhp: Math.round(deskOriginalUsd * USD_TO_PHP),
    blurb: "Prop firms, teams, power users.",
    features: [
      "Everything in Operator",
      "5 seats · team dashboard",
      "API + webhooks",
      "Prop-firm constraint engine",
      "Dedicated AI mentor",
    ],
    stripePriceId: env.stripe.priceDesk,
    paymongoCentavos: paymongoCentavosFor("DESK", deskUsd),
  },
};

/**
 * Compute the rounded-down savings percentage for a paid plan, given
 * its `priceUsd` and `originalPriceUsd`. Returns 0 for tiers without
 * a discount. Used to render the "Save NN%" badge.
 */
export function discountPercent(plan: PlanDef): number {
  if (!plan.originalPriceUsd || plan.originalPriceUsd <= plan.priceUsd) return 0;
  return Math.floor(((plan.originalPriceUsd - plan.priceUsd) / plan.originalPriceUsd) * 100);
}

/** Resolve a Stripe price id back to our Plan enum. Used by webhook handlers. */
export function planFromStripePriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === env.stripe.priceOperator) return "OPERATOR";
  if (priceId === env.stripe.priceDesk) return "DESK";
  return null;
}

/**
 * Resolve a PayMongo PaymentIntent metadata back to our Plan enum.
 * The intent carries `voidexxPlan: "OPERATOR" | "DESK"` set at
 * creation time — direct map, no inversion needed.
 */
export function planFromPaymongoMetadata(metadata: Record<string, string> | null | undefined): Plan | null {
  const v = metadata?.voidexxPlan;
  if (v === "OPERATOR" || v === "DESK") return v;
  return null;
}

/** True if a given plan can be purchased via Stripe checkout. */
export function isPurchasable(plan: Plan): boolean {
  const p = PLANS[plan];
  return p.priceUsd > 0 && Boolean(p.stripePriceId);
}

/** True if a given plan can be purchased via PayMongo checkout. */
export function isPurchasableViaPaymongo(plan: Plan): boolean {
  const p = PLANS[plan];
  return p.priceUsd > 0 && Boolean(p.paymongoCentavos);
}
