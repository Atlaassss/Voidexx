/**
 * S3 / R2 presigned upload issuer.
 *
 * In demo mode (no S3 env), `presignUpload` returns a placeholder
 * upload URL. The client detects this and skips the PUT step,
 * keeping the local blob URL as the screenshot reference. This
 * keeps the autopsy interaction working without infrastructure.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "node:crypto";
import { env } from "./env";

export const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12 MB

let _client: S3Client | null = null;
function client(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: env.s3.region!,
    endpoint: env.s3.endpoint || undefined,
    forcePathStyle: Boolean(env.s3.endpoint),
    credentials:
      env.s3.accessKeyId && env.s3.secretAccessKey
        ? {
            accessKeyId: env.s3.accessKeyId,
            secretAccessKey: env.s3.secretAccessKey,
          }
        : undefined,
  });
  return _client;
}

function extFor(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  return "";
}

export interface PresignResult {
  /** Storage object key, used as the persistent upload identifier. */
  key: string;
  /** Presigned PUT URL the client should upload to (or `null` in demo mode). */
  uploadUrl: string | null;
  /** Public URL where the object will be readable after upload. */
  publicUrl: string | null;
  /** True when no real S3 is configured. */
  demo: boolean;
}

export async function presignUpload(opts: {
  userId: string;
  contentType: string;
  size: number;
}): Promise<PresignResult> {
  const id = randomBytes(12).toString("hex");
  const key = `uploads/${opts.userId}/${Date.now()}-${id}${extFor(opts.contentType)}`;

  if (!env.s3.enabled) {
    return { key, uploadUrl: null, publicUrl: null, demo: true };
  }

  const cmd = new PutObjectCommand({
    Bucket: env.s3.bucket,
    Key: key,
    ContentType: opts.contentType,
    ContentLength: opts.size,
  });
  const uploadUrl = await getSignedUrl(client(), cmd, { expiresIn: 600 });
  const publicUrl = env.s3.publicUrl
    ? `${env.s3.publicUrl.replace(/\/$/, "")}/${key}`
    : `https://${env.s3.bucket}.s3.${env.s3.region}.amazonaws.com/${key}`;

  return { key, uploadUrl, publicUrl, demo: false };
}
