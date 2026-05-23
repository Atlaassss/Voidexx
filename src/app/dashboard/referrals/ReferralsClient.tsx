"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/dash/Panel";
import {
  Check,
  Copy,
  Link2,
  Share2,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

interface ReferralsData {
  code: string | null;
  shareUrl: string | null;
  totalInvited: number;
  totalConverted: number;
  recentReferrals: Array<{
    createdAt: string;
    rewarded: boolean;
    refereeDisplay: string;
  }>;
  tiers: Array<{ count: number; reward: string }>;
  demo?: boolean;
}

export function ReferralsClient() {
  const [data, setData] = useState<ReferralsData | null>(null);
  const [copied, setCopied] = useState<"code" | "url" | null>(null);

  useEffect(() => {
    fetch("/api/referrals/me")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  async function copy(value: string, kind: "code" | "url") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* ignore */
    }
  }

  function share() {
    if (!data?.shareUrl) return;
    if (typeof navigator.share === "function") {
      void navigator.share({
        title: "Voidexx — AI Trade Autopsy",
        text: "Stop trading blind. The autopsy on your last loss is brutal.",
        url: data.shareUrl,
      }).catch(() => {});
    } else {
      void copy(data.shareUrl, "url");
    }
  }

  if (!data) {
    return (
      <div className="flex-1 p-6 font-mono text-sm text-void-700">
        Loading referral data...
      </div>
    );
  }

  const nextTier = data.tiers.find((t) => data.totalConverted < t.count);
  const tierProgress = nextTier
    ? Math.min(100, (data.totalConverted / nextTier.count) * 100)
    : 100;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Share rail */}
        <div className="space-y-6 xl:col-span-7">
          <Panel title="Your share link" meta={data.code ? `code · ${data.code}` : "minting…"}>
            <div className="space-y-4">
              <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                Drop this anywhere a trader will see it. First-touch attribution
                — the cookie sticks for 30 days.
              </div>

              {/* Big code display */}
              <button
                type="button"
                onClick={() => data.code && copy(data.code, "code")}
                className="group relative block w-full overflow-hidden border border-signal-green/40 bg-signal-green/[0.04] p-6 text-left transition hover:border-signal-green hover:bg-signal-green/[0.08]"
              >
                <div className="absolute inset-0 bg-grid-fine opacity-30" />
                <div className="relative">
                  <div className="font-mono text-[10px] uppercase tracking-widest3 text-signal-green/80">
                    OPERATOR CODE
                  </div>
                  <div className="mt-2 font-mono text-4xl font-bold tracking-[0.18em] text-signal-green sm:text-5xl">
                    {data.code ?? "————————"}
                  </div>
                </div>
                <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest2 text-signal-green opacity-0 transition group-hover:opacity-100">
                  {copied === "code" ? (
                    <>
                      <Check className="h-3 w-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy code
                    </>
                  )}
                </span>
              </button>

              {/* Share URL row */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                <div className="flex items-center border border-void-300/70 bg-void-100/40 px-3 py-2 font-mono text-[12px] text-void-900">
                  <Link2 className="mr-2 h-3.5 w-3.5 shrink-0 text-signal-cyan" />
                  <span className="truncate">{data.shareUrl ?? "—"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => data.shareUrl && copy(data.shareUrl, "url")}
                  className="btn-ghost"
                >
                  {copied === "url" ? (
                    <>
                      <Check className="h-3 w-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy URL
                    </>
                  )}
                </button>
                <button type="button" onClick={share} className="btn-primary">
                  <Share2 className="h-3 w-3" /> Share
                </button>
              </div>

              {data.demo && (
                <div className="border border-signal-amber/40 bg-signal-amber/[0.06] p-3 font-mono text-[11px] text-signal-amber">
                  Demo mode — set DATABASE_URL to mint a real, persistent code.
                </div>
              )}
            </div>
          </Panel>

          {/* Recent referrals */}
          <Panel
            title="Recent invitees"
            meta={`${data.recentReferrals.length} of ${data.totalInvited}`}
          >
            {data.recentReferrals.length === 0 ? (
              <div className="py-6 text-center font-mono text-[11px] text-void-700">
                No invitees yet. Share your code to start the chain reaction.
              </div>
            ) : (
              <ul className="divide-y divide-void-300/40">
                {data.recentReferrals.map((r, i) => (
                  <li key={i} className="flex items-center gap-3 py-2.5">
                    <div className="grid h-7 w-7 shrink-0 place-items-center border border-void-300/70 bg-void-100/40 font-mono text-[10px] uppercase text-void-700">
                      {r.refereeDisplay.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[12px] text-void-900">
                        operator-{r.refereeDisplay}
                      </div>
                      <div className="font-mono text-[10px] text-void-700">
                        {new Date(r.createdAt).toLocaleDateString()} ·{" "}
                        {timeAgo(new Date(r.createdAt))}
                      </div>
                    </div>
                    {r.rewarded ? (
                      <span className="inline-flex items-center gap-1 border border-signal-green/40 bg-signal-green/[0.08] px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-signal-green">
                        <Sparkles className="h-3 w-3" /> Converted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 border border-void-300/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                        Pending
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Stats + tiers rail */}
        <div className="space-y-6 xl:col-span-5">
          <div className="grid grid-cols-2 gap-3">
            <KpiCell
              label="Invited"
              value={data.totalInvited}
              icon={Users}
              color="text-signal-cyan"
            />
            <KpiCell
              label="Converted"
              value={data.totalConverted}
              icon={Sparkles}
              color="text-signal-green"
            />
          </div>

          <Panel title="Reward tiers" meta="paid conversions">
            <div className="space-y-4">
              {nextTier && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2">
                    <span className="text-void-700">
                      Next: {nextTier.count} converts
                    </span>
                    <span className="text-signal-cyan">
                      {data.totalConverted}/{nextTier.count}
                    </span>
                  </div>
                  <div className="h-1.5 bg-void-200">
                    <div
                      className="h-full bg-gradient-to-r from-signal-cyan to-signal-green transition-all"
                      style={{ width: `${tierProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <ul className="space-y-2">
                {data.tiers.map((t) => {
                  const reached = data.totalConverted >= t.count;
                  return (
                    <li
                      key={t.count}
                      className={`flex items-center gap-3 border px-3 py-2.5 transition ${
                        reached
                          ? "border-signal-green/40 bg-signal-green/[0.04]"
                          : "border-void-300/70"
                      }`}
                    >
                      <Trophy
                        className={`h-4 w-4 shrink-0 ${
                          reached ? "text-signal-green" : "text-void-700"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className={`font-mono text-[11px] uppercase tracking-widest2 ${
                            reached ? "text-signal-green" : "text-void-800"
                          }`}
                        >
                          {t.count} converts
                        </div>
                        <div className="font-mono text-[10px] text-void-700">
                          {t.reward}
                        </div>
                      </div>
                      {reached && (
                        <Check className="h-4 w-4 shrink-0 text-signal-green" />
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-void-300/40 pt-3 font-mono text-[10px] leading-relaxed text-void-700">
                Rewards apply after the invitee converts to a paid plan.
                The credit is granted manually by the operations team — we
                review for fraud and stack it onto your next billing cycle.
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function KpiCell({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="cell brackets p-4">
      <span className="b1" />
      <span className="b2" />
      <div className="flex items-center gap-3">
        <Icon className={`h-6 w-6 ${color}`} />
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            {label}
          </div>
          <div className="font-display text-2xl tracking-wide text-void-900">
            {value.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(d: Date): string {
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}
