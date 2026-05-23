/**
 * Lazy Stripe client.
 *
 * Imported only when env.stripe.enabled to keep the module graph light
 * in demo mode. Every billing route checks the flag first; this module
 * throws if reached without configuration.
 */

import { env } from "../env";

let _client: import("stripe").default | null = null;

export async function getStripe() {
  if (_client) return _client;
  if (!env.stripe.enabled) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  const { default: Stripe } = await import("stripe");
  _client = new Stripe(env.stripe.secretKey!, {
    // Pin the API version explicitly so server upgrades on Stripe's side
    // don't change response shapes under us. Bump deliberately as part
    // of a billing migration when we want new features.
    apiVersion: "2025-02-24.acacia",
    appInfo: {
      name: "voidexx-web",
      version: "0.1.0",
    },
    typescript: true,
  });
  return _client;
}
