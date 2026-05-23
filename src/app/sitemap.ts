import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { getAllPosts } from "@/lib/blog";

/**
 * Sitemap — Next 15 file convention.
 *
 * Includes the marketing landing, sign-in / sign-up entry points, and
 * every published blog post. The dashboard isn't listed (auth-gated,
 * not useful for crawlers).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.app.url.replace(/\/$/, "");
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/sign-in`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/sign-up`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const posts = await getAllPosts();
  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...postEntries];
}
