/**
 * Plan SSOT.
 *
 * One place to define plan id, display name, monthly price, feature
 * bullets, and the Stripe price id env binding. Every other piece of
 * billing UI / logic reads from here so prices & features can't drift.
 */

import { env } from "../env";
import type { Plan } from "@prisma/client";

export interface PlanDef {
  id: Plan;
  /** Marketing display name. */
  name: string;
  /** USD per month for paid tiers, 0 for free. */
  priceUsd: number;
  /** Short marketing line. */
  blurb: string;
  /** Feature bullets shown on /dashboard/billing. */
  features: string[];
  /** Stripe Price ID. Null for the free tier. */
  stripePriceId: string | undefined;
}

export const PLANS: Record<Plan, PlanDef> = {
  RECON: {
    id: "RECON",
    name: "Recon",
    priceUsd: 0,
    blurb: "Run autopsies. Get a feel.",
    features: [
      "5 trade autopsies / month",
      "Basic structural read",
      "Auto journal (limited)",
      "Ads enabled",
    ],
    stripePriceId: undefined,
  },
  OPERATOR: {
    id: "OPERATOR",
    name: "Operator",
    priceUsd: 24,
    blurb: "For active retail traders.",
    features: [
      "Unlimited autopsies",
      "Smart-money decoder",
      "Psychology + tilt guard",
      "Exchange automation (1 venue)",
      "Priority queue · zero ads",
    ],
    stripePriceId: env.stripe.priceOperator,
  },
  DESK: {
    id: "DESK",
    name: "Desk",
    priceUsd: 79,
    blurb: "Prop firms, teams, power users.",
    features: [
      "Everything in Operator",
      "5 seats · team dashboard",
      "API + webhooks",
      "Prop-firm constraint engine",
      "Dedicated AI mentor",
    ],
    stripePriceId: env.stripe.priceDesk,
  },
};

/** Resolve a Stripe price id back to our Plan enum. Used by webhook handlers. */
export function planFromStripePriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === env.stripe.priceOperator) return "OPERATOR";
  if (priceId === env.stripe.priceDesk) return "DESK";
  return null;
}

/** True if a given plan can be purchased via Stripe checkout. */
export function isPurchasable(plan: Plan): boolean {
  const p = PLANS[plan];
  return p.priceUsd > 0 && Boolean(p.stripePriceId);
}
