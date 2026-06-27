import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { PUBLIC_MARKETING_PATHS } from "@/lib/site-routes";
import { getPublicSiteUrl } from "@/lib/site-url";
import { TOPIC_LANDING_PAGES } from "@/lib/topic-landing-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getPublicSiteUrl();
  const topicDates = Object.fromEntries(
    TOPIC_LANDING_PAGES.map((page) => [page.path, "2026-03-18"])
  ) as Record<string, string>;
  const blogDates = Object.fromEntries(
    BLOG_POSTS.map((post) => [`/blog/${post.slug}`, post.publishedAt])
  ) as Record<string, string>;

  return PUBLIC_MARKETING_PATHS.map((path) => {
    const lastModified =
      path === "/blog"
        ? BLOG_POSTS[0]?.publishedAt
        : blogDates[path] ?? topicDates[path] ?? "2026-03-18";

    return {
      url: `${base}${path === "/" ? "" : path}`,
      lastModified: new Date(`${lastModified}T12:00:00`),
      changeFrequency: path.startsWith("/blog") ? ("weekly" as const) : ("monthly" as const),
      priority: path === "/" ? 1 : path.startsWith("/blog/") ? 0.7 : path.includes("-") ? 0.8 : 0.6
    };
  });
}
