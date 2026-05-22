/**
 * Lazy OpenAI client. Imports the SDK only when invoked, so the module
 * graph stays light when running in demo mode.
 */

import { env } from "../env";

let _client: import("openai").default | null = null;

export async function getOpenAI() {
  if (_client) return _client;
  if (!env.openai.enabled) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  const { default: OpenAI } = await import("openai");
  _client = new OpenAI({ apiKey: env.openai.apiKey });
  return _client;
}

/** Gpt-4o pricing as of late 2024. Used for cost estimates. */
export const PRICING = {
  "gpt-4o": { in: 2.5, out: 10.0 }, // USD per 1M tokens
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
} as const;

export type ModelName = keyof typeof PRICING;

/**
 * Compute cost in microUSD (1/1,000,000 of a dollar).
 * Example: 1500 input + 400 output gpt-4o = (1500*2.5 + 400*10) / 1M USD
 *        = 0.00775 USD = 7,750 microUSD.
 */
export function microUsd(model: ModelName, inTokens: number, outTokens: number): number {
  const p = PRICING[model];
  if (!p) return 0;
  const usd = (inTokens * p.in + outTokens * p.out) / 1_000_000;
  return Math.round(usd * 1_000_000);
}
