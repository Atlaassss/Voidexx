import Link from "next/link";
import type { Metadata } from "next";
import { TopNav } from "@/components/marketing/TopNav";
import { Footer } from "@/components/marketing/Footer";
import { getAllPosts } from "@/lib/blog";
import { ArrowUpRight, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Field Notes",
  description:
    "Forensic essays on smart-money concepts, liquidity, and the psychology of losing trades.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <>
      <TopNav />
      <main className="relative mx-auto max-w-[1100px] px-4 pb-24 pt-16 sm:px-6">
        <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-grid-fine opacity-30" />

        <header className="mb-12 sm:mb-16">
          <div className="font-mono text-[10px] uppercase tracking-widest3 text-signal-cyan">
            // Field notes
          </div>
          <h1 className="display-crush mt-3 text-[12vw] leading-[0.85] sm:text-[88px]">
            DEAD <span className="text-signal-green">TRADES_</span>
            <br />
            <span className="text-void-700">SPEAK_</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-void-800">
            Forensic essays from the desk: how liquidity is harvested, why your
            stops cluster where they cluster, and what a clean entry actually
            looks like under a microscope.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="border border-void-300/70 bg-void-100/40 p-8 text-center">
            <div className="font-mono text-[11px] uppercase tracking-widest2 text-void-700">
              No essays published yet
            </div>
            <p className="mt-2 text-sm text-void-800">
              First drops queued. Check back this week.
            </p>
          </div>
        ) : (
          <ul className="space-y-px bg-void-300/70">
            {posts.map((p) => (
              <li key={p.slug} className="bg-void-0">
                <Link
                  href={`/blog/${p.slug}`}
                  className="group block px-4 py-6 transition hover:bg-void-100/40 sm:px-6 sm:py-7"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
                    <time dateTime={p.publishedAt}>
                      {new Date(p.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                    <span className="text-void-400">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {p.readingTimeMinutes} min
                    </span>
                    <span className="text-void-400">·</span>
                    <span className="text-signal-cyan">{p.author}</span>
                  </div>

                  <h2 className="mt-2 font-display text-3xl uppercase tracking-tight text-void-900 transition group-hover:text-signal-green sm:text-4xl">
                    {p.title}
                  </h2>

                  <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-void-800">
                    {p.excerpt}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {p.tags.map((t) => (
                      <span key={t} className="chip">
                        {t}
                      </span>
                    ))}
                    <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest2 text-signal-cyan opacity-0 transition group-hover:opacity-100">
                      Read <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </>
  );
}
