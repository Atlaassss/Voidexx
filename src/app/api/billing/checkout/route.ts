import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/billing/checkout
 *
 * body: { plan: "OPERATOR" | "DESK", provider: "STRIPE" | "PAYPAL" | "GCASH" | "MAYA" }
 *
 * Real impl:
 *  - resolve userId from session
 *  - call Stripe / PayPal / Xendit (GCash, Maya) checkout APIs
 *  - persist a pending Payment row
 *  - return checkout url
 */
export async function POST() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
