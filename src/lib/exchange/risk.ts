/**
 * Risk engine.
 *
 * Pure functions over user state + market state. Called by future
 * order-placement code (Phase 6+) and by the automation page UI to
 * surface "you would be locked out right now" indicators.
 *
 * All thresholds are deliberately function arguments rather than
 * constants — they'll move into per-user / per-strategy settings
 * later, and hard-coding constants here would force a refactor.
 */

export interface RiskState {
  /** Cumulative R-multiple realised today (open positions excluded). */
  dailyRealisedR: number;
  /** Number of currently-open positions. */
  openPositionCount: number;
  /** Most recent stop-out timestamp, or null if user hasn't been stopped today. */
  lastStopOutAt: Date | null;
}

export interface RiskCaps {
  /** Maximum cumulative loss-R per UTC day before daily-loss lockout. */
  dailyLossCapR: number;
  /** Maximum concurrent open positions. */
  maxConcurrent: number;
  /** Cool-down minutes after any stop-out (revenge-trade guard). */
  tiltCooldownMinutes: number;
}

export const DEFAULT_RISK_CAPS: RiskCaps = {
  dailyLossCapR: 2.0,
  maxConcurrent: 3,
  tiltCooldownMinutes: 30,
};

export type RiskBlockReason =
  | "daily_loss_cap"
  | "too_many_concurrent"
  | "tilt_cooldown";

/** True if the user is locked out from opening new positions right now. */
export function isLockedOut(
  state: RiskState,
  caps: RiskCaps = DEFAULT_RISK_CAPS,
  now: Date = new Date(),
): RiskBlockReason | null {
  if (state.dailyRealisedR <= -caps.dailyLossCapR) {
    return "daily_loss_cap";
  }
  if (state.openPositionCount >= caps.maxConcurrent) {
    return "too_many_concurrent";
  }
  if (state.lastStopOutAt) {
    const elapsedMs = now.getTime() - state.lastStopOutAt.getTime();
    if (elapsedMs < caps.tiltCooldownMinutes * 60_000) {
      return "tilt_cooldown";
    }
  }
  return null;
}

/** Human-readable explanation for a block reason. Used in the UI. */
export function describeBlock(reason: RiskBlockReason, caps: RiskCaps = DEFAULT_RISK_CAPS): string {
  switch (reason) {
    case "daily_loss_cap":
      return `Daily loss cap hit (${caps.dailyLossCapR}R). New positions disabled until 00:00 UTC.`;
    case "too_many_concurrent":
      return `Already at ${caps.maxConcurrent} open positions. Close one before opening another.`;
    case "tilt_cooldown":
      return `Stop-out cool-down active. Wait ${caps.tiltCooldownMinutes} minutes after a loss.`;
  }
}
