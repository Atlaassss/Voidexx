import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** GET /api/trades — paginated list of user trades. Stub. */
export async function GET() {
  return NextResponse.json({ data: [], cursor: null });
}

/** POST /api/trades — manual trade creation (when not via autopsy). Stub. */
export async function POST() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
