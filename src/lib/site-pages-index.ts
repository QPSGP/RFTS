import { BLOG_POSTS } from "@/lib/blog-posts";
import { GOAL_LANDING_PAGES } from "@/lib/goal-landing-pages";
import { WELLNESS_BENEFIT_LINKS } from "@/lib/meditation-benefits";
import { buildAllAudioLandingContent } from "@/lib/audio-landing";
import { PUBLIC_MARKETING_PATHS } from "@/lib/site-routes";
import type { LibraryItem } from "@/lib/types";

export type SitePageCategory =
  | "marketing"
  | "goals"
  | "wellness"
  | "blog"
  | "audio"
  | "member"
  | "admin";

export type SitePageEntry = {
  category: SitePageCategory;
  categoryLabel: string;
  label: string;
  path: string;
};

const CATEGORY_LABELS: Record<SitePageCategory, string> = {
  marketing: "Marketing & public",
  goals: "Goal landing pages",
  wellness: "Wellness topic pages",
  blog: "Blog articles",
  audio: "Audio track landings",
  member: "Member & signup",
  admin: "Admin & staff"
};

const TOPIC_PATHS = new Set(
  [...GOAL_LANDING_PAGES.map((p) => p.path), ...WELLNESS_BENEFIT_LINKS.map((b) => b.path)]
);

const MARKETING_LABELS: Record<string, string> = {
  "/": "Home",
  "/how-it-works": "How it works",
  "/science": "Science",
  "/faqs": "FAQs",
  "/facilitator": "Facilitators",
  "/affiliates": "Affiliates",
  "/privacy-policy": "Privacy policy",
  "/terms-and-conditions": "Terms and conditions",
  "/terms-and-condition": "Terms (legacy)",
  "/signup/step-1-subscription-selection": "Signup",
  "/blog": "Blog index"
};

const MEMBER_APP_PATHS: { label: string; path: string }[] = [
  { label: "Member login", path: "/member/login" },
  { label: "Member library (browse)", path: "/library" },
  { label: "Play options / console", path: "/play-options" },
  { label: "Member profile", path: "/member/profile" },
  { label: "Facilitator login", path: "/login" }
];

const ADMIN_PATHS: { label: string; path: string }[] = [
  { label: "Admin content console", path: "/admin/content" },
  { label: "Admin dashboard", path: "/admin/dashboard" },
  { label: "Member issue reports", path: "/admin/member-issues" }
];

export function buildSitePageIndex(library: LibraryItem[]): SitePageEntry[] {
  const entries: SitePageEntry[] = [];

  for (const path of PUBLIC_MARKETING_PATHS) {
    if (path === "/blog" || GOAL_LANDING_PAGES.some((p) => p.path === path)) continue;
    if (TOPIC_PATHS.has(path)) continue;
    entries.push({
      category: "marketing",
      categoryLabel: CATEGORY_LABELS.marketing,
      label: MARKETING_LABELS[path] || path,
      path
    });
  }

  for (const page of GOAL_LANDING_PAGES) {
    entries.push({
      category: "goals",
      categoryLabel: CATEGORY_LABELS.goals,
      label: page.label,
      path: page.path
    });
  }

  for (const benefit of WELLNESS_BENEFIT_LINKS) {
    entries.push({
      category: "wellness",
      categoryLabel: CATEGORY_LABELS.wellness,
      label: benefit.label,
      path: benefit.path
    });
  }

  for (const post of BLOG_POSTS) {
    entries.push({
      category: "blog",
      categoryLabel: CATEGORY_LABELS.blog,
      label: post.title,
      path: `/blog/${post.slug}`
    });
  }

  for (const audio of buildAllAudioLandingContent(library)) {
    const label = audio.skuCode ? `${audio.skuCode} — ${audio.title}` : audio.title;
    entries.push({
      category: "audio",
      categoryLabel: CATEGORY_LABELS.audio,
      label,
      path: audio.path
    });
  }

  for (const item of MEMBER_APP_PATHS) {
    entries.push({
      category: "member",
      categoryLabel: CATEGORY_LABELS.member,
      label: item.label,
      path: item.path
    });
  }

  for (const item of library.filter((row) => row.audioUrl?.trim())) {
    entries.push({
      category: "member",
      categoryLabel: CATEGORY_LABELS.member,
      label: `Library playback · ${item.skuCode ? `${item.skuCode} — ` : ""}${item.title}`,
      path: `/library/${item.id}`
    });
  }

  for (const item of ADMIN_PATHS) {
    entries.push({
      category: "admin",
      categoryLabel: CATEGORY_LABELS.admin,
      label: item.label,
      path: item.path
    });
  }

  return entries;
}

export const SITE_PAGE_CATEGORIES: SitePageCategory[] = [
  "marketing",
  "goals",
  "wellness",
  "blog",
  "audio",
  "member",
  "admin"
];

export function groupSitePagesByCategory(entries: SitePageEntry[]): Record<SitePageCategory, SitePageEntry[]> {
  const grouped = Object.fromEntries(
    SITE_PAGE_CATEGORIES.map((cat) => [cat, [] as SitePageEntry[]])
  ) as Record<SitePageCategory, SitePageEntry[]>;
  for (const entry of entries) {
    grouped[entry.category].push(entry);
  }
  return grouped;
}
