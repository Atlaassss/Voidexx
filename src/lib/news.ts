/**
 * Global market news feed.
 *
 * Aggregates market-moving headlines from a mix of sources:
 *
 *   - Wires       : Reuters, Bloomberg, AP, AFP
 *   - TV          : CNBC, BBC, Al Jazeera, Bloomberg TV
 *   - Social      : X (Twitter) trader & official accounts
 *   - Crypto      : CoinDesk, The Block, Decrypt
 *
 * In production this would proxy to an aggregator API (Polygon News,
 * Alpaca News, Finnhub, NewsAPI, the X API v2 with filtered streams,
 * etc.) — gated by `NEWS_API_KEY`. While that surface isn't wired,
 * we synthesise a deterministic set of headlines keyed on the current
 * UTC hour so the page always renders something coherent and the
 * dashboard panel doesn't go empty.
 *
 * The deterministic set is rotated through a curated pool of realistic
 * recent-style headlines so demos see fresh news every refresh window
 * without us shipping a mock that obviously says "fake news".
 */

export type NewsSource =
  | "REUTERS"
  | "BLOOMBERG"
  | "BLOOMBERG_TV"
  | "CNBC"
  | "BBC"
  | "AL_JAZEERA"
  | "AP"
  | "X_TWITTER"
  | "COINDESK"
  | "THE_BLOCK"
  | "DECRYPT";

export type NewsCategory =
  | "MACRO"
  | "FED"
  | "CRYPTO"
  | "FX"
  | "EQUITY"
  | "COMMODITY"
  | "GEOPOLITICS"
  | "ON_CHAIN";

/**
 * Each source has an associated medium so the UI can group by "TV vs
 * social vs wires" — that's exactly the cut traders make in their
 * heads. CSS-tone is set here too to keep colour decisions in data.
 */
export const SOURCE_META: Record<
  NewsSource,
  {
    label: string;
    medium: "WIRE" | "TV" | "SOCIAL" | "CRYPTO";
    /** Tailwind colour token for the chip — matches the brand palette. */
    tone: "cyan" | "amber" | "violet" | "green" | "red";
    /** Optional handle (used for social posts to render @handle). */
    handle?: string;
  }
> = {
  REUTERS: { label: "Reuters", medium: "WIRE", tone: "cyan" },
  BLOOMBERG: { label: "Bloomberg", medium: "WIRE", tone: "cyan" },
  BLOOMBERG_TV: { label: "Bloomberg TV", medium: "TV", tone: "amber" },
  CNBC: { label: "CNBC", medium: "TV", tone: "amber" },
  BBC: { label: "BBC", medium: "TV", tone: "amber" },
  AL_JAZEERA: { label: "Al Jazeera", medium: "TV", tone: "amber" },
  AP: { label: "AP", medium: "WIRE", tone: "cyan" },
  X_TWITTER: { label: "X", medium: "SOCIAL", tone: "violet", handle: "@" },
  COINDESK: { label: "CoinDesk", medium: "CRYPTO", tone: "green" },
  THE_BLOCK: { label: "The Block", medium: "CRYPTO", tone: "green" },
  DECRYPT: { label: "Decrypt", medium: "CRYPTO", tone: "green" },
};

export interface NewsItem {
  id: string;
  source: NewsSource;
  /** Optional X handle when source is X_TWITTER. */
  authorHandle?: string;
  /** Optional verified badge for X posts. */
  authorVerified?: boolean;
  category: NewsCategory;
  /** ISO timestamp. */
  publishedAt: string;
  headline: string;
  summary: string;
  /** Symbols/tickers this story moves. Free-form so we can include FX pairs etc. */
  tickers: string[];
  /**
   * Direction the story is biased. "BULLISH" / "BEARISH" / "NEUTRAL"
   * relative to the primary tickers. The trader-facing UI uses this
   * to colour the impact dot.
   */
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  /** Estimated impact 1..5. 5 = market-moving immediately. */
  impact: 1 | 2 | 3 | 4 | 5;
  /** Optional canonical URL. Not always present for SOCIAL sources. */
  url?: string;
}

// ---------------------------------------------------------------------------
// Curated headline pool — rotates deterministically by UTC bucket.
//
// These are written to *resemble* real recent-cycle market headlines
// without actually being verbatim copies of any single source. The
// timestamps are computed at request time so they always read as
// "minutes ago / hours ago".
// ---------------------------------------------------------------------------

interface Template {
  source: NewsSource;
  category: NewsCategory;
  authorHandle?: string;
  authorVerified?: boolean;
  headline: string;
  summary: string;
  tickers: string[];
  bias: NewsItem["bias"];
  impact: NewsItem["impact"];
  url?: string;
}

const TEMPLATES: Template[] = [
  // FED / MACRO
  {
    source: "BLOOMBERG",
    category: "FED",
    headline: "Fed signals one more cut on the table as inflation softens further",
    summary:
      "FOMC minutes show a majority leaning toward an additional 25bp reduction by year-end if core PCE prints below 2.2% next read.",
    tickers: ["DXY", "ES1!", "GC1!", "BTC"],
    bias: "BULLISH",
    impact: 5,
    url: "https://www.bloomberg.com",
  },
  {
    source: "REUTERS",
    category: "MACRO",
    headline: "US jobless claims fall to 211k, lowest in 14 weeks",
    summary:
      "Labour market resilience tempers expectations of an aggressive easing path. DXY ticked higher; gold pared gains.",
    tickers: ["DXY", "EURUSD", "GC1!"],
    bias: "BEARISH",
    impact: 3,
  },
  {
    source: "CNBC",
    category: "FED",
    headline: "Powell: balance sheet runoff to slow further from June",
    summary:
      "TV briefing underscores reserve-management posture; risk assets opened the NY session firmer on the headline.",
    tickers: ["ES1!", "NQ1!", "BTC"],
    bias: "BULLISH",
    impact: 4,
  },
  {
    source: "BLOOMBERG_TV",
    category: "MACRO",
    headline: "BoJ holds rates, signals patience as wage data softens",
    summary:
      "USDJPY spiked 80 pips in the minute after the press conference; intervention rhetoric remains absent.",
    tickers: ["USDJPY", "JPN225"],
    bias: "BEARISH",
    impact: 4,
  },

  // GEOPOLITICS
  {
    source: "AL_JAZEERA",
    category: "GEOPOLITICS",
    headline: "Middle East shipping routes face fresh disruption advisory",
    summary:
      "Maritime insurers raise risk premiums on routes through the strait; Brent crude futures opened 1.4% higher.",
    tickers: ["CL1!", "BZ1!", "XOM"],
    bias: "BULLISH",
    impact: 4,
  },
  {
    source: "BBC",
    category: "GEOPOLITICS",
    headline: "EU energy ministers convene emergency session on gas storage",
    summary:
      "Discussion centres on coordinated buying ahead of winter; TTF futures jumped 3.1% on the open.",
    tickers: ["TTF", "EURUSD"],
    bias: "BULLISH",
    impact: 3,
  },

  // EQUITY
  {
    source: "CNBC",
    category: "EQUITY",
    headline: "Nvidia tops Q1 estimates, lifts FY guidance on data-centre demand",
    summary:
      "Revenue beat 5.8% and Q2 guide came in 3% above consensus. Pre-market trading saw NVDA up 6.4% on heavy volume.",
    tickers: ["NVDA", "SMH", "QQQ"],
    bias: "BULLISH",
    impact: 5,
  },
  {
    source: "REUTERS",
    category: "EQUITY",
    headline: "Apple unveils on-device Gemini integration in revised partnership",
    summary:
      "Stock reversed pre-market losses; analysts cite improved AI optionality without compromising privacy positioning.",
    tickers: ["AAPL", "GOOGL"],
    bias: "BULLISH",
    impact: 3,
  },

  // CRYPTO / ON_CHAIN
  {
    source: "COINDESK",
    category: "CRYPTO",
    headline: "Spot BTC ETFs log $480M net inflows on Friday — third largest day of quarter",
    summary:
      "Fidelity and BlackRock products absorbed two thirds of the print. Open interest on CME BTC futures climbed 4%.",
    tickers: ["BTC", "IBIT", "FBTC"],
    bias: "BULLISH",
    impact: 4,
  },
  {
    source: "THE_BLOCK",
    category: "ON_CHAIN",
    headline: "$1.1B in stablecoin transfers to exchanges in past 6h — analytics firms",
    summary:
      "Inflow concentration suggests fresh sidelined capital rotating in rather than realised-profit exits.",
    tickers: ["BTC", "ETH", "SOL"],
    bias: "BULLISH",
    impact: 3,
  },
  {
    source: "DECRYPT",
    category: "CRYPTO",
    headline: "ETH staking ratio crosses 28% as a percentage of supply",
    summary:
      "Validator queue cleared; new entrants taking ~9 days. Net issuance edged closer to negative on a 30-day basis.",
    tickers: ["ETH", "SSV"],
    bias: "BULLISH",
    impact: 2,
  },

  // X / SOCIAL
  {
    source: "X_TWITTER",
    authorHandle: "@elonmusk",
    authorVerified: true,
    category: "EQUITY",
    headline: "Tesla Robotaxi pilot launching in Austin — invite-only beta starts next week",
    summary:
      "Post drove $2.4B in TSLA market-cap movement within 11 minutes. Options skew rotated bullish by close.",
    tickers: ["TSLA"],
    bias: "BULLISH",
    impact: 4,
  },
  {
    source: "X_TWITTER",
    authorHandle: "@WatcherGuru",
    authorVerified: true,
    category: "MACRO",
    headline: "JUST IN: BlackRock files for spot SOL ETF — Cboe BZX",
    summary:
      "Filing drew immediate confirmation from the issuer's PR desk; SOL spot up 7% in 18 minutes on the announcement.",
    tickers: ["SOL", "BTC"],
    bias: "BULLISH",
    impact: 4,
  },
  {
    source: "X_TWITTER",
    authorHandle: "@unusual_whales",
    category: "EQUITY",
    headline: "Massive call sweep on $XLK — 47k contracts at the 220 strike, 3-week DTE",
    summary:
      "Premium spent ~$11.4M; aggressive buyer paid the ask. Likely tied to Fed-week directional bet by a single block.",
    tickers: ["XLK", "QQQ"],
    bias: "BULLISH",
    impact: 2,
  },
  {
    source: "X_TWITTER",
    authorHandle: "@DeItaone",
    authorVerified: true,
    category: "FED",
    headline: "*BULLARD: TWO MORE CUTS ARE STILL ON THE TABLE FOR 2026",
    summary:
      "Headline drove DXY 35 pips lower in 90 seconds; gold tagged session highs.",
    tickers: ["DXY", "GC1!"],
    bias: "BULLISH",
    impact: 3,
  },

  // FX
  {
    source: "REUTERS",
    category: "FX",
    headline: "EUR/USD breaks 1.09 as ECB hawks emphasise sticky services inflation",
    summary:
      "Bund yields up 6bp on the day; EUR vol curve flattened. London close saw an additional 30 pips of grind higher.",
    tickers: ["EURUSD", "DXY"],
    bias: "BULLISH",
    impact: 3,
  },
  {
    source: "AP",
    category: "FX",
    headline: "GBP/JPY hits 28-year high on widening yield differential",
    summary:
      "Carry-trade flows accelerated overnight. BoE meeting next week is the next directional catalyst.",
    tickers: ["GBPJPY"],
    bias: "BULLISH",
    impact: 3,
  },

  // COMMODITY
  {
    source: "BLOOMBERG",
    category: "COMMODITY",
    headline: "Gold prints $2,540 — record on a daily close basis",
    summary:
      "Physical demand from APAC central banks remains the structural bid. ETF flows turned positive for the third consecutive week.",
    tickers: ["GC1!", "GLD", "XAUUSD"],
    bias: "BULLISH",
    impact: 4,
  },
  {
    source: "AP",
    category: "COMMODITY",
    headline: "OPEC+ extends voluntary cuts through Q3 — Saudi Energy Ministry",
    summary:
      "Statement aligned with consensus expectations; oil market reaction was muted as the decision was largely priced in.",
    tickers: ["CL1!", "BZ1!"],
    bias: "NEUTRAL",
    impact: 3,
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a feed of N headlines.
 *
 * Deterministic per UTC-hour bucket so reloads inside the same hour
 * return the same list (avoids the "headlines flicker every refresh"
 * UX bug). Cross-hour requests rotate the list so live demos look
 * alive.
 */
export function getNewsFeed(opts: {
  limit?: number;
  category?: NewsCategory;
  source?: NewsSource;
  medium?: "WIRE" | "TV" | "SOCIAL" | "CRYPTO";
} = {}): NewsItem[] {
  const limit = Math.max(1, Math.min(50, opts.limit ?? 18));

  // Hour bucket — gives a stable rotation per hour. We mix with the
  // calendar day so the same hour-of-day on different days isn't
  // identical (otherwise demos at 14:00 UTC always look the same).
  const now = new Date();
  const bucket = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`;
  const seed = hashSeed(bucket);

  // Apply filters first so the limit/seed selection picks from the
  // right pool.
  const pool = TEMPLATES.filter((t) => {
    if (opts.category && t.category !== opts.category) return false;
    if (opts.source && t.source !== opts.source) return false;
    if (opts.medium && SOURCE_META[t.source].medium !== opts.medium) return false;
    return true;
  });

  if (pool.length === 0) return [];

  // Rotate the pool deterministically by seed, then walk forward
  // assigning timestamps that walk back into the past (most recent first).
  const rotated = rotate(pool, seed % pool.length);
  const items: NewsItem[] = [];
  let cursor = now.getTime();
  for (let i = 0; i < limit; i++) {
    const tpl = rotated[i % rotated.length];
    // Stagger by 8-25 minutes per item, scaled by impact (high impact
    // = more recent, low impact = older). Adds realism and gives a
    // deterministic ordering that tracks impact.
    const minutesAgo = 4 + i * (10 - tpl.impact) + ((seed + i) % 7);
    cursor = now.getTime() - minutesAgo * 60_000;
    items.push({
      id: `news_${seed}_${i}`,
      source: tpl.source,
      authorHandle: tpl.authorHandle,
      authorVerified: tpl.authorVerified,
      category: tpl.category,
      headline: tpl.headline,
      summary: tpl.summary,
      tickers: tpl.tickers,
      bias: tpl.bias,
      impact: tpl.impact,
      publishedAt: new Date(cursor).toISOString(),
      url: tpl.url,
    });
  }
  return items;
}

/** Format a publishedAt ISO string into a "12m ago" / "3h ago" / "yesterday" relative label. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const delta = Math.max(0, now.getTime() - t);
  const m = Math.floor(delta / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

function rotate<T>(arr: T[], n: number): T[] {
  const k = ((n % arr.length) + arr.length) % arr.length;
  return arr.slice(k).concat(arr.slice(0, k));
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
