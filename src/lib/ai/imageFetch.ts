/**
 * Resolve an upload key to data the OpenAI vision API can consume.
 *
 * Strategy:
 *  - If S3 is configured AND the key looks like a real upload key
 *    (`uploads/<userId>/...`), GetObject and inline as a base64 data URL.
 *    Inlining works regardless of bucket public/private status.
 *  - Otherwise (demo or unknown key), return null — the mock vision
 *    pass kicks in.
 */

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../env";

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

export async function resolveUploadToDataUrl(uploadKey: string): Promise<string | null> {
  if (!env.s3.enabled) return null;
  if (!uploadKey.startsWith("uploads/")) return null;

  try {
    const cmd = new GetObjectCommand({ Bucket: env.s3.bucket, Key: uploadKey });
    const res = await client().send(cmd);
    const body = res.Body;
    if (!body) return null;
    // @aws-sdk/client-s3 returns a stream; transformToByteArray exists in v3.
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    const buf = Buffer.from(bytes);
    const mime = res.ContentType ?? guessMime(uploadKey);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch (err) {
    console.error("[ai/imageFetch] S3 GetObject failed", err);
    return null;
  }
}

function guessMime(key: string): string {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
