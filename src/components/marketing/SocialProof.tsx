"use client";

const QUOTES = [
  {
    q: "Found out my entire 'losing streak' was just me shorting into Asia liquidity for six months. Caught it in two uploads.",
    a: "K. Adeyemi",
    r: "FTMO 200K, prop trader",
  },
  {
    q: "Killed my revenge habit. The auto-lock after a stop-out is genuinely the feature I didn't know I needed.",
    a: "M. Halverson",
    r: "Crypto scalper · 4y",
  },
  {
    q: "Reads charts better than half the discords I pay for. Cheaper too.",
    a: "S. Park",
    r: "Forex swing trader",
  },
];

const METRICS = [
  { v: "148,392", k: "Trades dissected" },
  { v: "11,204", k: "Active accounts" },
  { v: "+34%", k: "Avg. discipline lift", c: "text-signal-green" },
  { v: "94 / 100", k: "Median report quality" },
];

export function SocialProof() {
  return (
    <section className="relative border-b border-void-300/60 py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-px border border-void-300/70 bg-void-300/70 sm:grid-cols-4">
          {METRICS.map((m, i) => (
            <div key={i} className="bg-void-0 p-6">
              <div className={`font-display text-3xl tracking-wide sm:text-4xl ${m.c ?? "text-void-900"}`}>
                {m.v}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                {m.k}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {QUOTES.map((t, i) => (
            <figure key={i} className="cell brackets p-6">
              <span className="b1" />
              <span className="b2" />
              <blockquote className="text-pretty text-base leading-relaxed text-void-900">
                <span className="editorial text-3xl text-signal-cyan">&ldquo;</span>
                {t.q}
              </blockquote>
              <figcaption className="mt-5 font-mono text-[11px] uppercase tracking-widest2 text-void-700">
                {t.a} <span className="text-void-600">// {t.r}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
