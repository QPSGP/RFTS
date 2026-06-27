import { HOMEPAGE_GOAL_CARDS, type GoalLandingSlug } from "@/lib/homepage-goals";
import { WELLNESS_BENEFIT_LINKS } from "@/lib/meditation-benefits";
import { getBlogPostsNewestFirst, type BlogPost } from "@/lib/blog-posts";
import type { TopicLandingSlug } from "@/lib/topic-landing-pages";

/** Every article should drive signup — use in CTAs and new post checklists. */
export const BLOG_SIGNUP_PATH = "/signup/step-1-subscription-selection";

export const BLOG_SIGNUP_HREF = BLOG_SIGNUP_PATH;

/** Days without a new post before the weekly cadence is considered overdue. */
export const BLOG_CADENCE_INTERVAL_DAYS = 7;

export type BlogWeeklyTopicKind = "goal" | "wellness";

export type BlogWeeklyTopic = {
  id: string;
  kind: BlogWeeklyTopicKind;
  label: string;
  path: string;
  goalSlug?: GoalLandingSlug;
  wellnessSlug?: TopicLandingSlug;
};

const WELLNESS_PATH_TO_TOPIC: Partial<Record<string, TopicLandingSlug>> = {
  "/sleep-meditation": "sleep-meditation",
  "/stress-relief": "stress-relief",
  "/pain-relief": "pain-relief",
  "/memory-improvement": "memory-improvement",
  "/blood-pressure-regulation": "blood-pressure-regulation",
  "/resilience-meditation": "resilience-meditation",
  "/emotional-health": "emotional-health",
  "/will-power": "will-power",
  "/self-awareness": "self-awareness"
};

/** Interleaved rotation: goals and wellness areas — one article per week. */
export const BLOG_WEEKLY_ROTATION: BlogWeeklyTopic[] = (() => {
  const goals: BlogWeeklyTopic[] = HOMEPAGE_GOAL_CARDS.map((card) => ({
    id: `goal-${card.slug}`,
    kind: "goal" as const,
    label: card.label,
    path: card.path,
    goalSlug: card.slug
  }));
  const wellness: BlogWeeklyTopic[] = WELLNESS_BENEFIT_LINKS.map((benefit) => ({
    id: `wellness-${benefit.path}`,
    kind: "wellness" as const,
    label: benefit.label,
    path: benefit.path,
    wellnessSlug: WELLNESS_PATH_TO_TOPIC[benefit.path]
  }));
  const merged: BlogWeeklyTopic[] = [];
  const max = Math.max(goals.length, wellness.length);
  for (let i = 0; i < max; i++) {
    if (i < goals.length) merged.push(goals[i]);
    if (i < wellness.length) merged.push(wellness[i]);
  }
  return merged;
})();

export type BlogCadenceStatus = {
  due: boolean;
  daysSinceLatest: number | null;
  latestPublishedAt: string | null;
  latestTitle: string | null;
  nextTopic: BlogWeeklyTopic;
  signupPath: string;
};

export function getNextWeeklyTopic(postCount = getBlogPostsNewestFirst().length): BlogWeeklyTopic {
  if (BLOG_WEEKLY_ROTATION.length === 0) {
    throw new Error("BLOG_WEEKLY_ROTATION is empty");
  }
  return BLOG_WEEKLY_ROTATION[postCount % BLOG_WEEKLY_ROTATION.length];
}

export function getBlogCadenceStatus(posts: BlogPost[] = getBlogPostsNewestFirst()): BlogCadenceStatus {
  const latest = posts[0];
  let daysSinceLatest: number | null = null;
  let due = true;

  if (latest?.publishedAt) {
    const latestMs = Date.parse(`${latest.publishedAt}T12:00:00`);
    if (!Number.isNaN(latestMs)) {
      daysSinceLatest = Math.floor((Date.now() - latestMs) / 86400000);
      due = daysSinceLatest >= BLOG_CADENCE_INTERVAL_DAYS;
    }
  }

  return {
    due,
    daysSinceLatest,
    latestPublishedAt: latest?.publishedAt ?? null,
    latestTitle: latest?.title ?? null,
    nextTopic: getNextWeeklyTopic(posts.length),
    signupPath: BLOG_SIGNUP_PATH
  };
}

export function formatBlogCadenceReminder(status: BlogCadenceStatus): string {
  const lines = [
    "Reach For The Stars — weekly blog cadence",
    "",
    status.due
      ? `Action needed: no new article in ${status.daysSinceLatest ?? "∞"} days (target: every ${BLOG_CADENCE_INTERVAL_DAYS} days).`
      : `On track: latest post was ${status.daysSinceLatest} day(s) ago.`,
    "",
    `Latest: ${status.latestTitle ?? "none"} (${status.latestPublishedAt ?? "—"})`,
    "",
    `Suggested next topic (${status.nextTopic.kind}): ${status.nextTopic.label}`,
    `Landing page: ${status.nextTopic.path}`,
    `Signup CTA: ${status.signupPath}`,
    "",
    "Checklist for each article:",
    "- Add entry to src/lib/blog-posts.ts (transcript excerpt + link to topic/goal page)",
    "- End with signup CTA (BlogPostView includes Start your journey)",
    "- Run npm run blog:check-cadence after publish",
    "- See docs/BLOG_WEEKLY_CADENCE.md"
  ];
  return lines.join("\n");
}
