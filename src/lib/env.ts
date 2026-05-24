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

const stripeSec = process.env.STRIPE_SECRET_KEY;
const stripeWebhook = process.env.STRIPE_WEBHOOK_SECRET;
const stripePub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePriceOperator = process.env.STRIPE_PRICE_OPERATOR;
const stripePriceDesk = process.env.STRIPE_PRICE_DESK;

const paymongoSec = process.env.PAYMONGO_SECRET_KEY;
const paymongoPub = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY;
const paymongoWebhook = process.env.PAYMONGO_WEBHOOK_SECRET;
const paymongoPriceOperatorPhp = process.env.PAYMONGO_PRICE_OPERATOR_PHP;
const paymongoPriceDeskPhp = process.env.PAYMONGO_PRICE_DESK_PHP;

const resendKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM_ADDRESS;

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
  stripe: {
    // Stripe needs at minimum the secret key to issue checkout sessions.
    // The webhook secret is needed only to verify inbound events; we
    // surface it as a separate flag so the checkout flow can be partially
    // wired (test mode) before webhook secrets are provisioned.
    enabled: Boolean(stripeSec),
    webhookEnabled: Boolean(stripeSec && stripeWebhook),
    secretKey: stripeSec,
    publishableKey: stripePub,
    webhookSecret: stripeWebhook,
    priceOperator: stripePriceOperator,
    priceDesk: stripePriceDesk,
    portalReturnUrl:
      process.env.STRIPE_PORTAL_RETURN_URL ??
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/billing`,
    successUrl:
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/billing?checkout=success`,
    cancelUrl:
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/billing?checkout=cancelled`,
  },
  paymongo: {
    // PayMongo is the Philippine payment rail — covers GCash, Maya,
    // GrabPay, BPI, BDO, UnionBank online + cards (Visa/MC/JCB/Amex).
    // Using a SOURCE-based flow with PaymentIntent + PaymentMethod
    // (the "PayMongo Payments API" rather than the older Sources API),
    // because Sources is being deprecated and intents handle 3DS cleanly.
    enabled: Boolean(paymongoSec),
    webhookEnabled: Boolean(paymongoSec && paymongoWebhook),
    secretKey: paymongoSec,
    publicKey: paymongoPub,
    webhookSecret: paymongoWebhook,
    // PHP-denominated "prices". Stored as STRING centavos to mirror the
    // Stripe Price-id pattern; we don't actually have a Price object in
    // PayMongo (their PaymentIntent takes a raw amount), but using
    // env-driven amounts gives ops the same upgrade-pricing-without-redeploy
    // workflow they have on Stripe.
    priceOperatorPhp: paymongoPriceOperatorPhp,
    priceDeskPhp: paymongoPriceDeskPhp,
    successUrl:
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/billing?checkout=success&provider=paymongo`,
    cancelUrl:
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/billing?checkout=cancelled&provider=paymongo`,
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
  email: {
    // True once Resend is configured. When disabled, every send() call
    // logs the email and returns success — the welcome / autopsy-ready
    // / plan-changed flows stay wired without burning real mail.
    enabled: Boolean(resendKey),
    resendApiKey: resendKey,
    fromAddress: emailFrom ?? "Voidexx <ops@voidexx.io>",
  },
  admin: {
    // Admin panel is "enabled" when both auth AND db are wired — the role
    // check is the real gate, but we can't do role checks without a DB.
    enabled: Boolean(clerkPub && clerkSec && dbUrl),
  },
} as const;

/** Boolean for clients — true when ALL critical subsystems are wired. */
export const isFullyConfigured =
  env.clerk.enabled &&
  env.db.enabled &&
  env.s3.enabled &&
  env.openai.enabled &&
  // At least ONE billing rail. PH-first deploys may run PayMongo alone;
  // global deploys may run Stripe alone; both is fine too.
  (env.stripe.enabled || env.paymongo.enabled);

/** Boolean for clients — true when at least one subsystem is missing. */
export const isDemoMode = !isFullyConfigured;

/**
 * Loud production guard.
 *
 * If we're in `NODE_ENV=production` and any critical subsystem is still
 * unwired, log a single ERROR-level line at module load. This catches
 * the failure mode where someone deploys to Vercel without setting one
 * of the env blocks — the app would silently keep serving demo-mode
 * autopsies (mocked verdicts, no persistence) to paying customers.
 *
 * We don't throw because that would crash production for the OTHER
 * subsystems' missing keys (e.g. a deploy without S3 yet should still
 * boot and serve marketing). The loud log is the alert.
 */
if (process.env.NODE_ENV === "production") {
  const missing: string[] = [];
  if (!env.clerk.enabled) missing.push("CLERK_*");
  if (!env.db.enabled) missing.push("DATABASE_URL");
  if (!env.s3.enabled) missing.push("S3_*");
  if (!env.openai.enabled) missing.push("OPENAI_API_KEY");
  // Billing: at least ONE rail must be wired. Stripe handles global,
  // PayMongo handles the Philippines (GCash / Maya / GrabPay / cards).
  // Either alone is enough to take payments — only flag when BOTH are
  // missing so a PH-first launch isn't held up by Stripe config.
  if (!env.stripe.enabled && !env.paymongo.enabled) {
    missing.push("STRIPE_SECRET_KEY or PAYMONGO_SECRET_KEY");
  }
  if (env.stripe.enabled && !env.stripe.webhookEnabled) missing.push("STRIPE_WEBHOOK_SECRET");
  if (env.paymongo.enabled && !env.paymongo.webhookEnabled) missing.push("PAYMONGO_WEBHOOK_SECRET");
  if (!env.email.enabled) missing.push("RESEND_API_KEY");
  if (missing.length > 0) {
    // Use console.error so it shows up on Vercel / Railway / Render
    // log dashboards with the proper severity.
    console.error(
      `[VOIDEXX][PRODUCTION-WARN] Demo mode active — missing env: ${missing.join(", ")}. ` +
        `Customer-visible features will fall back to mocks/no-ops.`,
    );
  }
}
