import Link from "next/link";
import type { ReactNode } from "react";
import { TopNav } from "@/components/marketing/TopNav";
import { Footer } from "@/components/marketing/Footer";

/**
 * Shared shell for the stub legal / marketing-secondary pages.
 *
 * These pages exist so the site footer stops linking to `href="#"`. Each
 * one is intentionally short — a single panel with a "Last updated"
 * stamp, a sub-headline, and a few paragraphs. Real legal docs replace
 * these wholesale; this is the structural scaffold so traffic doesn't
 * land on broken anchors and so the brand aesthetic carries through.
 */
export function PageShell({
  eyebrow,
  title,
  italic,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  italic?: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <main className="relative bg-grid">
      <TopNav />
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-32 sm:px-6">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest3 text-signal-cyan">
          <span className="grid h-5 w-5 place-items-center border border-signal-cyan/60">
            §
          </span>
          <span>{eyebrow}</span>
          <span className="h-px flex-1 bg-void-300/70" />
          {updated && <span className="text-void-700">last update · {updated}</span>}
        </div>

        <h1 className="display-crush mt-4 text-5xl sm:text-7xl">
          {title}
          {italic && (
            <>
              <br />
              <span className="editorial text-signal-amber">{italic}</span>
            </>
          )}
        </h1>

        <div className="mt-10 space-y-5 text-[15px] leading-relaxed text-void-800 [&_a]:text-signal-cyan [&_a:hover]:underline [&_h2]:font-display [&_h2]:text-2xl [&_h2]:tracking-wide [&_h2]:text-void-900 [&_h2]:mt-10 [&_h2]:mb-2 [&_code]:font-mono [&_code]:text-signal-cyan [&_code]:bg-void-100/60 [&_code]:px-1 [&_code]:py-0.5 [&_li]:list-none [&_ul]:space-y-1 [&_ul>li]:relative [&_ul>li]:pl-4 [&_ul>li]:before:content-['_'] [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:top-0 [&_ul>li]:before:text-signal-cyan">
          {children}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-void-300/60 pt-6 font-mono text-[11px] uppercase tracking-widest2 text-void-700">
          <Link
            href="/"
            className="text-void-700 transition hover:text-signal-cyan"
          >
            ← back to home
          </Link>
          <span className="text-void-700">questions → ops@voidexx.io</span>
        </div>
      </article>
      <Footer />
    </main>
  );
}
