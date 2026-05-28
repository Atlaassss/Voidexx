/**
 * Tiny helper for "client preview mode".
 *
 * When `NEXT_PUBLIC_HIDE_DEMO_BANNER=1` is set, the user is showing
 * the UI to clients/stakeholders and doesn't want demo annotations
 * cluttering the screen. Pages that render inline "Demo session …"
 * notices, "Demo · set X" sub-headers, or yellow info banners should
 * suppress them when this flag is on.
 *
 * Buttons that hit unconfigured services still return helpful 503s
 * — the goal here is purely visual cleanup, not pretending the
 * subsystem works.
 */
export const previewMode =
  process.env.NEXT_PUBLIC_HIDE_DEMO_BANNER === "1";
