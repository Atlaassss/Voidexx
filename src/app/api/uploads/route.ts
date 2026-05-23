import { NextResponse } from "next/server";
import { requireUser, asResponse } from "@/lib/auth";
import { presignUpload, ALLOWED_MIME, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { PresignRequestSchema, badRequest } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * POST /api/uploads
 *
 * Issues a presigned PUT URL the browser uses to upload the screenshot
 * directly to S3 / R2. We never proxy the file bytes through the API.
 *
 * Request:  { contentType, size, filename? }
 * Response: { key, uploadUrl, publicUrl, demo, maxBytes }
 *
 * In demo mode (no S3), `uploadUrl` is null and the client keeps the
 * local blob URL as the screenshot reference for the autopsy step.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const json = await req.json().catch(() => ({}));
    const parsed = PresignRequestSchema.safeParse(json);
    if (!parsed.success) return badRequest(parsed.error);

    const { contentType, size } = parsed.data;
    if (!ALLOWED_MIME.has(contentType)) {
      return NextResponse.json(
        { error: "unsupported_media_type", allowed: [...ALLOWED_MIME] },
        { status: 415 },
      );
    }
    if (size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "payload_too_large", maxBytes: MAX_UPLOAD_BYTES },
        { status: 413 },
      );
    }

    const result = await presignUpload({
      userId: user.id,
      contentType,
      size,
    });

    return NextResponse.json({
      ...result,
      maxBytes: MAX_UPLOAD_BYTES,
    });
  } catch (err) {
    const r = asResponse(err);
    if (r) return r;
    console.error("[uploads] presign failed", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
