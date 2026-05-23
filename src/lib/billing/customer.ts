/**
 * Customer reconciliation helpers.
 *
 * Stripe identifies the paying party by `customer.id`; we identify our
 * user by `User.id`. These helpers keep the two in sync without forcing
 * every route to know the dance.
 */

import { getStripe } from "./stripe";
import { getDb } from "../db";
import type { SessionUser } from "../auth";

/**
 * Return a Stripe customer id for the given user, creating one in
 * Stripe and persisting it on the User row if it doesn't exist yet.
 *
 * Idempotent: subsequent calls hit the persisted id directly.
 */
export async function getOrCreateStripeCustomer(user: SessionUser): Promise<string> {
  const db = getDb();
  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true },
  });
  if (row?.stripeCustomerId) return row.stripeCustomerId;

  const stripe = await getStripe();
  const customer = await stripe.customers.create({
    // Email is required for receipts. ensureDbUser guarantees we have one
    // (synthetic placeholder if Clerk hadn't surfaced a real one yet).
    email: user.email ?? undefined,
    name: user.displayName ?? undefined,
    metadata: {
      voidexxUserId: user.id,
    },
  });

  await db.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

/**
 * Resolve a Stripe customer id back to a User row. Used by webhook
 * handlers when we have an event but need to know whose plan to update.
 *
 * Returns null if no User row matches — log + skip rather than crash so
 * a stray webhook for a deleted user doesn't bring down the endpoint.
 */
export async function userIdFromStripeCustomer(stripeCustomerId: string): Promise<string | null> {
  const db = getDb();
  const row = await db.user.findUnique({
    where: { stripeCustomerId },
    select: { id: true },
  });
  return row?.id ?? null;
}
