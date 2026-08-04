import type { MetadataRoute } from "next";
import { buildIndexableAudioLandingContent } from "@/lib/audio-landing";
import { getBlogPostsNewestFirst } from "@/lib/blog-posts";
import { listLibrary } from "@/lib/db";
import { PUBLIC_MARKETING_PATHS } from "@/lib/site-routes";
import { getPublicSiteUrl } from "@/lib/site-url";
import { GOAL_LANDING_PAGES } from "@/lib/goal-landing-pages";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPublicSiteUrl();
  const library = await listLibrary();
  const audioPages = buildIndexableAudioLandingContent(library);
  const publishedPosts = getBlogPostsNewestFirst();

  const topicDates = Object.fromEntries(
    GOAL_LANDING_PAGES.map((page) => [page.path, "2026-03-19"])
  ) as Record<string, string>;
  const blogDates = Object.fromEntries(
    publishedPosts.map((post) => [`/blog/${post.slug}`, post.publishedAt])
  ) as Record<string, string>;

  const staticEntries = PUBLIC_MARKETING_PATHS.map((path) => {
    const lastModified =
      path === "/blog"
        ? publishedPosts[0]?.publishedAt
        : blogDates[path] ?? topicDates[path] ?? "2026-03-18";

    return {
      url: `${base}${path === "/" ? "" : path}`,
      lastModified: new Date(`${lastModified}T12:00:00`),
      changeFrequency: path.startsWith("/blog") ? ("weekly" as const) : ("monthly" as const),
      priority: path === "/" ? 1 : path.startsWith("/blog/") ? 0.7 : path.includes("-") ? 0.8 : 0.6
    };
  });

  const audioEntries = audioPages.map((page) => ({
    url: `${base}${page.path}`,
    lastModified: new Date("2026-06-18T12:00:00"),
    changeFrequency: "monthly" as const,
    priority: 0.65
  }));

  return [...staticEntries, ...audioEntries];
}
