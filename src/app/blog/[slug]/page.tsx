import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { TopNav } from "@/components/marketing/TopNav";
import { Footer } from "@/components/marketing/Footer";
import { getAllPosts, getPost } from "@/lib/blog";
import { ArrowLeft, Clock } from "lucide-react";

export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function BlogPostPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const Body = post.Component;

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[760px] px-4 pb-24 pt-12 sm:px-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest2 text-void-700 transition hover:text-signal-cyan"
        >
          <ArrowLeft className="h-3 w-3" /> All field notes
        </Link>

        <header className="mt-8 mb-10 border-b border-void-300/70 pb-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-widest2 text-void-700">
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
            <span className="text-void-400">·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.readingTimeMinutes} min
            </span>
            <span className="text-void-400">·</span>
            <span className="text-signal-cyan">{post.author}</span>
          </div>
          <h1 className="mt-4 font-display text-4xl uppercase leading-[0.95] tracking-tight text-void-900 sm:text-5xl lg:text-6xl">
            {post.title}
          </h1>
          <p className="mt-5 font-serif text-xl italic leading-relaxed text-void-800 sm:text-2xl">
            {post.excerpt}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {post.tags.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
        </header>

        <article className="mb-16">
          <Body />
        </article>

        <div className="border-t border-void-300/70 pt-8">
          <div className="border border-signal-green/40 bg-signal-green/[0.04] p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest2 text-signal-green">
              // Stop reading. Start dissecting.
            </div>
            <h3 className="mt-2 font-display text-2xl uppercase tracking-tight text-void-900">
              Run your first autopsy free.
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-void-800">
              Drop a screenshot of any closed trade. The engine reads the
              chart and writes the verdict in under a minute.
            </p>
            <Link href="/dashboard/upload" className="btn-primary mt-4 inline-flex">
              Begin →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
