import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * robots.txt — Next 15 file convention.
 *
 * Allow: marketing, blog. Disallow: dashboard, auth, API. The dashboard
 * is auth-gated and would only return sign-in pages anyway, but listing
 * it explicitly keeps it out of search-suggestion noise.
 */
export default function robots(): MetadataRoute.Robots {
  const base = env.app.url.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/blog/"],
        disallow: ["/dashboard", "/dashboard/", "/sign-in", "/sign-up", "/api/", "/r/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
