/**
 * Centralised env access with feature flags.
 *
 * The app is designed to run in DEMO MODE when subsystems are unconfigured,
 * so the home, dashboard, and autopsy interaction always work locally
 * without any keys. As soon as a subsystem's env is filled in, the real
 * implementation activates.
 */

const clerkPub = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const clerkSec = process.env.CLERK_SECRET_KEY;
const dbUrl = process.env.DATABASE_URL;
const openaiKey = process.env.OPENAI_API_KEY;

const s3Bucket = process.env.S3_BUCKET;
const s3Region = process.env.S3_REGION;
const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID;
const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const s3Endpoint = process.env.S3_ENDPOINT;
const s3PublicUrl = process.env.S3_PUBLIC_URL;

export const env = {
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  },
  clerk: {
    enabled: Boolean(clerkPub && clerkSec),
    publishableKey: clerkPub,
    secretKey: clerkSec,
    signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in",
    signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? "/sign-up",
  },
  db: {
    enabled: Boolean(dbUrl),
    url: dbUrl,
  },
  openai: {
    enabled: Boolean(openaiKey),
    apiKey: openaiKey,
  },
  s3: {
    enabled: Boolean(s3Bucket && s3Region && s3AccessKeyId && s3SecretAccessKey),
    bucket: s3Bucket,
    region: s3Region,
    accessKeyId: s3AccessKeyId,
    secretAccessKey: s3SecretAccessKey,
    endpoint: s3Endpoint,
    publicUrl: s3PublicUrl,
  },
} as const;

/** Boolean for clients — true when ALL critical subsystems are wired. */
export const isFullyConfigured =
  env.clerk.enabled && env.db.enabled && env.s3.enabled && env.openai.enabled;

/** Boolean for clients — true when at least one subsystem is missing. */
export const isDemoMode = !isFullyConfigured;
