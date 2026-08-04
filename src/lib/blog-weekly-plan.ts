import { HOMEPAGE_GOAL_CARDS, type GoalLandingSlug } from "@/lib/homepage-goals";
import { WELLNESS_BENEFIT_LINKS } from "@/lib/meditation-benefits";
import { getBlogPostsNewestFirst, type BlogPost } from "@/lib/blog-posts";
import type { TopicLandingSlug } from "@/lib/topic-landing-pages";
import { buildMarketingSignupHref } from "@/lib/marketing-signup";

/** Every article should drive signup — use in CTAs and new post checklists. */
export const BLOG_SIGNUP_PATH = buildMarketingSignupHref();

export const BLOG_SIGNUP_HREF = BLOG_SIGNUP_PATH;

/** Target published posts per calendar week (Mon–Sun UTC). */
export const BLOG_POSTS_PER_WEEK = 3;

/** @deprecated Prefer BLOG_POSTS_PER_WEEK; kept for older docs/scripts. */
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
  "/burnout-recovery": "burnout-recovery",
  "/pain-relief": "pain-relief",
  "/memory-improvement": "memory-improvement",
  "/blood-pressure-regulation": "blood-pressure-regulation",
  "/resilience-meditation": "resilience-meditation",
  "/emotional-health": "emotional-health",
  "/will-power": "will-power",
  "/self-awareness": "self-awareness"
};

/** Interleaved rotation: goals and wellness areas. */
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
  /** True when behind this week's 3-post pace. */
  due: boolean;
  daysSinceLatest: number | null;
  latestPublishedAt: string | null;
  latestTitle: string | null;
  nextTopic: BlogWeeklyTopic;
  signupPath: string;
  weekStartIso: string;
  weekEndIso: string;
  publishedThisWeek: number;
  target: number;
  expectedByToday: number;
  message: string;
};

/** Monday 00:00:00.000 UTC of the week containing `date`. */
export function startOfUtcWeek(date: Date = new Date()): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function endOfUtcWeek(date: Date = new Date()): Date {
  const start = startOfUtcWeek(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

/**
 * Pace milestones: Mon–Tue ≥1, Wed–Thu ≥2, Fri–Sun ≥3.
 */
export function expectedPostsByWeekday(utcDay: number): number {
  if (utcDay === 1 || utcDay === 2) return 1;
  if (utcDay === 3 || utcDay === 4) return 2;
  return BLOG_POSTS_PER_WEEK;
}

export function countPublishedInWeek(posts: BlogPost[], now: Date = new Date()): number {
  const start = startOfUtcWeek(now).getTime();
  const end = endOfUtcWeek(now).getTime();
  return posts.filter((post) => {
    if (!post.publishedAt) return false;
    const t = Date.parse(`${post.publishedAt}T12:00:00.000Z`);
    return Number.isFinite(t) && t >= start && t <= end;
  }).length;
}

export function getNextWeeklyTopic(postCount = getBlogPostsNewestFirst().length): BlogWeeklyTopic {
  if (BLOG_WEEKLY_ROTATION.length === 0) {
    throw new Error("BLOG_WEEKLY_ROTATION is empty");
  }
  return BLOG_WEEKLY_ROTATION[postCount % BLOG_WEEKLY_ROTATION.length];
}

export function getBlogCadenceStatus(
  posts: BlogPost[] = getBlogPostsNewestFirst(),
  now: Date = new Date()
): BlogCadenceStatus {
  const latest = posts[0];
  let daysSinceLatest: number | null = null;

  if (latest?.publishedAt) {
    const latestMs = Date.parse(`${latest.publishedAt}T12:00:00.000Z`);
    if (!Number.isNaN(latestMs)) {
      daysSinceLatest = Math.floor((now.getTime() - latestMs) / 86400000);
    }
  }

  const weekStart = startOfUtcWeek(now);
  const weekEnd = endOfUtcWeek(now);
  const publishedThisWeek = countPublishedInWeek(posts, now);
  const expectedByToday = expectedPostsByWeekday(now.getUTCDay());
  const due = publishedThisWeek < expectedByToday;
  const remaining = Math.max(0, BLOG_POSTS_PER_WEEK - publishedThisWeek);

  let message: string;
  if (publishedThisWeek >= BLOG_POSTS_PER_WEEK) {
    message = `On track: ${publishedThisWeek}/${BLOG_POSTS_PER_WEEK} posts published this week.`;
  } else if (due) {
    message = `Blog cadence late: ${publishedThisWeek}/${BLOG_POSTS_PER_WEEK} this week (expected at least ${expectedByToday} by today). Publish ${remaining} more.`;
  } else {
    message = `On pace: ${publishedThisWeek}/${BLOG_POSTS_PER_WEEK} this week (need ${remaining} more by Sunday).`;
  }

  return {
    due,
    daysSinceLatest,
    latestPublishedAt: latest?.publishedAt ?? null,
    latestTitle: latest?.title ?? null,
    nextTopic: getNextWeeklyTopic(posts.length),
    signupPath: BLOG_SIGNUP_PATH,
    weekStartIso: weekStart.toISOString().slice(0, 10),
    weekEndIso: weekEnd.toISOString().slice(0, 10),
    publishedThisWeek,
    target: BLOG_POSTS_PER_WEEK,
    expectedByToday,
    message
  };
}

export function formatBlogCadenceReminder(status: BlogCadenceStatus): string {
  const lines = [
    "Reach For The Stars — blog cadence (3 posts / week)",
    "",
    status.message,
    "",
    `Week (UTC): ${status.weekStartIso} → ${status.weekEndIso}`,
    `Published this week: ${status.publishedThisWeek}/${status.target}`,
    status.due
      ? "Action needed: catch up before the week ends."
      : "Still on pace for this week.",
    "",
    `Latest: ${status.latestTitle ?? "none"} (${status.latestPublishedAt ?? "—"})`,
    status.daysSinceLatest != null ? `Days since latest: ${status.daysSinceLatest}` : "",
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
  ].filter((line, i, arr) => line !== "" || arr[i - 1] !== "");
  return lines.join("\n");
}
