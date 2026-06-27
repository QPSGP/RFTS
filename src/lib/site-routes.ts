import { BLOG_POSTS } from "@/lib/blog-posts";
import { GOAL_LANDING_PAGES } from "@/lib/goal-landing-pages";
import { TOPIC_LANDING_PAGES } from "@/lib/topic-landing-pages";

/** Public marketing routes included in sitemap (no auth-only paths). */
export const PUBLIC_MARKETING_PATHS = [
  "/",
  "/how-it-works",
  "/science",
  "/faqs",
  "/facilitator",
  "/affiliates",
  "/privacy-policy",
  "/terms-and-conditions",
  "/terms-and-condition",
  "/signup/step-1-subscription-selection",
  "/blog",
  ...GOAL_LANDING_PAGES.map((page) => page.path),
  ...TOPIC_LANDING_PAGES.map((page) => page.path),
  ...BLOG_POSTS.map((post) => `/blog/${post.slug}`)
] as const;
