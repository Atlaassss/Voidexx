import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crosshair, Layers, ShieldAlert, ExternalLink } from "lucide-react";
import { tryGetDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SharePageProps {
  params: Promise<{ shareId: string }>;
}

/**
 * Public, read-only autopsy view.
 *
 * URL: /share/<shareId>
 *
 *   - Anyone can view (no auth).
 *   - Only renders if the owner has shareEnabled=true. Disabling on
 *     the dashboard takes immediate effect — the URL stops resolving.
 *   - Strips owner-identifying details: we show only displayName (with
 *     fallback to "A trader"), no email / username / Stripe IDs.
 *   - Strong CTA back to the home page so visitors who like what they
 *     see can convert.
 *
 * In demo mode we 404 — there's no DB to look the shareId up in. The
 * share button on the dashboard already shows a toast explaining this.
 */
export default async function SharePage({ params }: SharePageProps) {
  const { shareId } = await params;

  const db = tryGetDb();
  if (!db) notFound();

  const row = await db.autopsy.findFirst({
    where: { shareId, shareEnabled: true },
    include: {
      trade: {
        select: {
          symbol: true,
          timeframe: true,
          direction: true,
          screenshotUrl: true,
        },
      },
      user: { select: { displayName: true, username: true } },
    },
  });
  if (!row) notFound();

  const score = row.score;
  const scoreColor =
    score >= 75
      ? "text-signal-green"
      : score >= 50
        ? "text-signal-amber"
        : "text-signal-red";
  const author = row.user.displayName ?? row.user.username ?? "A trader";

  return (
    <main className="relative min-h-screen bg-grid">
      {/* Slim top nav — branded, links home */}
      <nav className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-void-300/70 bg-void-0/80 px-4 backdrop-blur-md sm:px-6">
        <Link href="/" className="font-display text-xl tracking-wide">
          VOID<span className="text-signal-green">EXX_</span>
        </Link>
        <Link
          href="/dashboard"
          className="btn-primary hidden sm:inline-flex"
        >
          Run your own autopsy →
        </Link>
        <Link href="/dashboard" className="btn-ghost sm:hidden">
          Try →
        </Link>
      </nav>

      <article className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Eyebrow */}
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest3 text-signal-cyan">
          <span className="grid h-5 w-5 place-items-center border border-signal-cyan/60">
            §
          </span>
          <span>Public · trade autopsy</span>
          <span className="h-px flex-1 bg-void-300/70" />
          <span className="text-void-700">
            shared by {author}
          </span>
        </div>

        <h1 className="display-crush mt-4 text-5xl leading-none sm:text-7xl">
          {row.trade.symbol} ·{" "}
          <span className="text-signal-amber">{row.trade.timeframe}</span>
          <br />
          <span className="editorial text-signal-cyan">
            {row.trade.direction === "LONG" ? "long" : "short"}.
          </span>
        </h1>

        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-void-800">
          {row.verdict}
        </p>

        {/* Big-three meta strip — verdict score + result + flags count */}
        <div className="mt-10 grid grid-cols-1 gap-px bg-void-300/60 sm:grid-cols-3">
          <div className="bg-void-50/60 p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
              Verdict score
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`font-display text-7xl leading-none ${scoreColor}`}>
                {score}
              </span>
              <span className="font-mono text-[11px] text-void-700">/ 100</span>
            </div>
          </div>
          <div className="bg-void-50/60 p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
              Flags fired
            </div>
            <div className="mt-2 font-display text-5xl leading-none">
              {(row.flags as string[]).length}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {(row.flags as string[]).slice(0, 3).map((f) => (
                <span
                  key={f}
                  className="border border-signal-amber/40 bg-signal-amber/[0.08] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest2 text-signal-amber"
                >
                  {f.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-void-50/60 p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest2 text-void-700">
              Concepts engaged
            </div>
            <div className="mt-2 font-display text-5xl leading-none">
              {(row.concepts as string[]).length}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {(row.concepts as string[]).slice(0, 3).map((c) => (
                <span
                  key={c}
                  className="border border-signal-violet/40 bg-signal-violet/[0.08] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest2 text-signal-violet"
                >
                  {c.replace(/-/g, " ")}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Optional screenshot */}
        {row.trade.screenshotUrl && (
          <div className="mt-10 border border-void-300/70 bg-void-100/40">
            <div className="flex items-center justify-between border-b border-void-300/70 px-4 py-2 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
              <span>Original screenshot</span>
              <span>READ-ONLY</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.trade.screenshotUrl}
              alt={`${row.trade.symbol} ${row.trade.timeframe} chart`}
              className="block w-full"
            />
          </div>
        )}

        {/* What you did + improvement */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Block icon={ShieldAlert} title="What happened" body={row.summary} tone="red" />
          <Block icon={Crosshair} title="Improvement plan" body={row.improvement} tone="green" />
        </div>

        {/* Concepts list */}
        <div className="mt-8 border border-void-300/70 bg-void-100/40 p-5">
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            <Layers className="h-3 w-3" />
            ICT / SMC concepts
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(row.concepts as string[]).map((c) => (
              <span
                key={c}
                className="border border-void-300/70 bg-void-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest2 text-void-800"
              >
                {c.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 border border-signal-green/40 bg-signal-green/[0.06] p-6 text-center">
          <div className="font-mono text-[10px] uppercase tracking-widest2 text-signal-green">
            Like what you see?
          </div>
          <h2 className="display-crush mt-2 text-3xl sm:text-4xl">
            Drop your own losing trade.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-void-800">
            VOIDEXX writes a forensic autopsy of why the stop got hit — the
            exact same engine that wrote the one above. Free for 5 trades a
            month, no card required.
          </p>
          <Link
            href="/dashboard"
            className="btn-primary mt-5 inline-flex"
          >
            Start free <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Footer credit */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-void-300/60 pt-6 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
          <span>shared {row.createdAt.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}</span>
          <Link href="/" className="transition hover:text-signal-cyan">
            voidexx · trade autopsy →
          </Link>
        </div>
      </article>
    </main>
  );
}

/** Per-shared-page metadata — populates the OG card with real autopsy data. */
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { shareId } = await params;
  const db = tryGetDb();
  if (!db) {
    return {
      title: "Trade autopsy",
      robots: { index: false, follow: false },
    };
  }
  const row = await db.autopsy.findFirst({
    where: { shareId, shareEnabled: true },
    select: {
      score: true,
      verdict: true,
      trade: { select: { symbol: true, timeframe: true, direction: true } },
      user: { select: { displayName: true, username: true } },
    },
  });
  if (!row) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  const author = row.user.displayName ?? row.user.username ?? "A trader";
  const title = `${row.trade.symbol} ${row.trade.direction} · ${row.score}/100 · trade autopsy`;
  const description = `${author} got their loss decoded. Verdict: ${row.verdict}`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
    // Don't index shared pages — they reference user-uploaded screenshots
    // that may contain account numbers, broker IDs, real positions etc.
    // The owner explicitly opted into sharing, but search-indexing is a
    // different consent surface.
    robots: { index: false, follow: false },
  };
}

function Block({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  tone: "red" | "green";
}) {
  const map = {
    red: { bd: "border-signal-red/40", tx: "text-signal-red", bg: "bg-signal-red/[0.04]" },
    green: { bd: "border-signal-green/40", tx: "text-signal-green", bg: "bg-signal-green/[0.04]" },
  }[tone];
  return (
    <div className={`relative border ${map.bd} ${map.bg} p-5`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${map.tx}`} />
        <div className={`font-mono text-[10px] uppercase tracking-widest2 ${map.tx}`}>
          {title}
        </div>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-void-800">{body}</p>
    </div>
  );
}
