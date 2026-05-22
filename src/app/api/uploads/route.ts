import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/uploads
 * Stub for signed-URL flow. Real impl: validate auth, request a presigned PUT
 * URL from S3 / R2, return uploadId + url. Client uploads directly to storage
 * and then calls /api/autopsy with the uploadId.
 *
 * Hard-block: max 12 MB, mime type in [image/png, image/jpeg, image/webp].
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "not_implemented",
      hint: "Wire to S3/R2 presigned PUT in next phase",
    },
    { status: 501 },
  );
}
