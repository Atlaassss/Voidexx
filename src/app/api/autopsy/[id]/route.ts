import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/autopsy/:id
 * Stub: would return the persisted AutopsyResponse for the given id.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json({ error: "not_implemented", id }, { status: 501 });
}
