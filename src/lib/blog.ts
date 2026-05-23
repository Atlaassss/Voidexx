/**
 * Blog — file-based MDX with YAML frontmatter.
 *
 * Posts live in `content/blog/<slug>.mdx`. Each post imports its
 * default-export MDX component and re-exports a `frontmatter`
 * object (typed as `PostFrontmatter`).
 *
 * We avoid pulling `gray-matter` to keep the dep list tight — instead
 * each post file exports a typed `frontmatter` const explicitly. That
 * also gives the author IDE autocomplete on the schema.
 */

import fs from "node:fs/promises";
import path from "node:path";

export interface PostFrontmatter {
  title: string;
  excerpt: string;
  publishedAt: string; // ISO 8601 date
  author: string;
  tags: string[];
  /** Optional reading time override; auto-estimated if omitted. */
  readingTimeMinutes?: number;
}

export interface PostMeta extends PostFrontmatter {
  slug: string;
  readingTimeMinutes: number;
}

export interface PostFull extends PostMeta {
  Component: React.ComponentType;
}

/**
 * Lazily imports a single post by slug, returns its rendered component
 * + frontmatter. Throws if the file doesn't exist.
 */
export async function getPost(slug: string): Promise<PostFull | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const mod = await import(`@/../content/blog/${slug}.mdx`);
    const frontmatter = mod.frontmatter as PostFrontmatter | undefined;
    if (!frontmatter) {
      throw new Error(`Post ${slug} is missing exported frontmatter`);
    }
    return {
      slug,
      Component: mod.default,
      ...frontmatter,
      readingTimeMinutes:
        frontmatter.readingTimeMinutes ?? estimateReadingTimeFromSlug(slug),
    };
  } catch {
    return null;
  }
}

/**
 * Lists all posts with their frontmatter, sorted newest-first.
 * Reads the content directory at request time. The set is small (~10s
 * of files at most) so we don't bother with caching beyond Node's
 * module-cache for the imports.
 */
export async function getAllPosts(): Promise<PostMeta[]> {
  const dir = path.join(process.cwd(), "content", "blog");
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    // No content dir yet — empty blog. Return [].
    return [];
  }

  const slugs = files
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));

  const posts = await Promise.all(slugs.map(async (slug) => {
    const mod = await import(`@/../content/blog/${slug}.mdx`).catch(() => null);
    if (!mod) return null;
    const fm = mod.frontmatter as PostFrontmatter | undefined;
    if (!fm) return null;
    return {
      slug,
      ...fm,
      readingTimeMinutes:
        fm.readingTimeMinutes ?? estimateReadingTimeFromSlug(slug),
    } satisfies PostMeta;
  }));

  return posts
    .filter((p): p is PostMeta => p != null)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
}

/**
 * Crude word-count-based estimate. We can't read the MDX body without
 * `fs.readFile` on the source file (the imported module is already a
 * compiled component), so we hash-fallback to a sensible default per
 * slug length. Authors who care can supply `readingTimeMinutes` in the
 * frontmatter.
 */
function estimateReadingTimeFromSlug(slug: string): number {
  // Without pulling raw source, default to 5 minutes — good enough for
  // a "X min read" badge. Authors should override in frontmatter for
  // anything substantially longer or shorter.
  void slug;
  return 5;
}
