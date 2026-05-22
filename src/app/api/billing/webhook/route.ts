import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/billing/webhook
 *
 * Stripe / PayPal webhook receiver. Real impl:
 *  - verify signature (Stripe-Signature header)
 *  - upsert Payment by providerRef
 *  - on PAID: bump user.plan + planRenewsAt
 *  - emit notification
 */
export async function POST() {
  return NextResponse.json({ received: true });
}
