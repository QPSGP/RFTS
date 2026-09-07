import { BLOG_POSTS, getBlogPost, getBlogPostsNewestFirst, type BlogPost } from "@/lib/blog-posts";
import {
  deleteSiteCopyOverride,
  getSiteCopyOverride,
  listSiteCopyOverrides,
  upsertSiteCopyOverride,
  type SiteCopyKind,
  type SiteCopyOverrideRecord
} from "@/lib/db";
import {
  GOAL_LANDING_PAGES,
  getGoalLandingPage,
  type GoalLandingContent
} from "@/lib/goal-landing-pages";
import {
  TOPIC_LANDING_PAGES,
  getTopicLandingPage,
  type TopicLandingContent
} from "@/lib/topic-landing-pages";

export type { SiteCopyKind };

export type TitledBody = { title: string; body: string };

export type GoalCopyOverlay = {
  label?: string;
  tagline?: string;
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
  heroLead?: string;
  eyebrow?: string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  howItHelps?: TitledBody[];
  nightlySteps?: TitledBody[];
};

export type TopicCopyOverlay = {
  pill?: string;
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
  heroLead?: string;
  eyebrow?: string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  howItHelps?: TitledBody[];
  nightlySteps?: TitledBody[];
};

export type BlogCopyOverlay = {
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
  excerpt?: string;
  readMinutes?: number;
  sections?: { heading?: string; paragraphs: string[] }[];
  transcriptExcerpt?: { sessionTitle: string; quote: string };
};

export type SiteCopyOverlay = GoalCopyOverlay | TopicCopyOverlay | BlogCopyOverlay;

export type SiteCopyCatalogEntry = {
  kind: SiteCopyKind;
  kindLabel: string;
  path: string;
  slug: string;
  label: string;
  customized: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
};

const KIND_LABELS: Record<SiteCopyKind, string> = {
  goal: "Goal landing pages",
  topic: "Wellness landing pages",
  blog: "Blog articles"
};

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function trimText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function overlayFromChanged<T extends Record<string, unknown>>(
  defaults: T,
  edited: T,
  keys: (keyof T)[]
): Partial<T> {
  const overlay: Partial<T> = {};
  for (const key of keys) {
    if (!sameJson(defaults[key], edited[key])) {
      overlay[key] = edited[key];
    }
  }
  return overlay;
}

export function applyGoalCopyOverlay(
  base: GoalLandingContent,
  overlay: GoalCopyOverlay | null | undefined
): GoalLandingContent {
  if (!overlay) return base;
  return {
    ...base,
    label: overlay.label ?? base.label,
    tagline: overlay.tagline ?? base.tagline,
    title: overlay.title ?? base.title,
    metaTitle: overlay.metaTitle ?? base.metaTitle,
    metaDescription: overlay.metaDescription ?? base.metaDescription,
    heroLead: overlay.heroLead ?? base.heroLead,
    eyebrow: overlay.eyebrow ?? base.eyebrow,
    sectionTitle: overlay.sectionTitle ?? base.sectionTitle,
    sectionSubtitle: overlay.sectionSubtitle ?? base.sectionSubtitle,
    howItHelps: overlay.howItHelps ?? base.howItHelps,
    nightlySteps: overlay.nightlySteps ?? base.nightlySteps
  };
}

export function applyTopicCopyOverlay(
  base: TopicLandingContent,
  overlay: TopicCopyOverlay | null | undefined
): TopicLandingContent {
  if (!overlay) return base;
  return {
    ...base,
    pill: overlay.pill ?? base.pill,
    title: overlay.title ?? base.title,
    metaTitle: overlay.metaTitle ?? base.metaTitle,
    metaDescription: overlay.metaDescription ?? base.metaDescription,
    heroLead: overlay.heroLead ?? base.heroLead,
    eyebrow: overlay.eyebrow ?? base.eyebrow,
    sectionTitle: overlay.sectionTitle ?? base.sectionTitle,
    sectionSubtitle: overlay.sectionSubtitle ?? base.sectionSubtitle,
    howItHelps: overlay.howItHelps ?? base.howItHelps,
    nightlySteps: overlay.nightlySteps ?? base.nightlySteps
  };
}

export function applyBlogCopyOverlay(
  base: BlogPost,
  overlay: BlogCopyOverlay | null | undefined
): BlogPost {
  if (!overlay) return base;
  return {
    ...base,
    title: overlay.title ?? base.title,
    metaTitle: overlay.metaTitle ?? base.metaTitle,
    metaDescription: overlay.metaDescription ?? base.metaDescription,
    excerpt: overlay.excerpt ?? base.excerpt,
    readMinutes: overlay.readMinutes ?? base.readMinutes,
    sections: overlay.sections ?? base.sections,
    transcriptExcerpt: overlay.transcriptExcerpt ?? base.transcriptExcerpt
  };
}

export function goalEditableFields(page: GoalLandingContent): GoalCopyOverlay {
  return {
    label: page.label,
    tagline: page.tagline,
    title: page.title,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    heroLead: page.heroLead,
    eyebrow: page.eyebrow,
    sectionTitle: page.sectionTitle,
    sectionSubtitle: page.sectionSubtitle,
    howItHelps: page.howItHelps,
    nightlySteps: page.nightlySteps
  };
}

export function topicEditableFields(page: TopicLandingContent): TopicCopyOverlay {
  return {
    pill: page.pill,
    title: page.title,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    heroLead: page.heroLead,
    eyebrow: page.eyebrow,
    sectionTitle: page.sectionTitle,
    sectionSubtitle: page.sectionSubtitle,
    howItHelps: page.howItHelps,
    nightlySteps: page.nightlySteps
  };
}

export function blogEditableFields(post: BlogPost): BlogCopyOverlay {
  return {
    title: post.title,
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    excerpt: post.excerpt,
    readMinutes: post.readMinutes,
    sections: post.sections,
    transcriptExcerpt: post.transcriptExcerpt
  };
}

function normalizeTitledBodies(items: TitledBody[] | undefined): TitledBody[] | undefined {
  if (!items) return undefined;
  return items.map((item) => ({
    title: trimText(item.title),
    body: trimText(item.body)
  }));
}

export function normalizeGoalCopy(input: GoalCopyOverlay): GoalCopyOverlay {
  return {
    ...input,
    label: input.label !== undefined ? trimText(input.label) : undefined,
    tagline: input.tagline !== undefined ? trimText(input.tagline) : undefined,
    title: input.title !== undefined ? trimText(input.title) : undefined,
    metaTitle: input.metaTitle !== undefined ? trimText(input.metaTitle) : undefined,
    metaDescription: input.metaDescription !== undefined ? trimText(input.metaDescription) : undefined,
    heroLead: input.heroLead !== undefined ? trimText(input.heroLead) : undefined,
    eyebrow: input.eyebrow !== undefined ? trimText(input.eyebrow) : undefined,
    sectionTitle: input.sectionTitle !== undefined ? trimText(input.sectionTitle) : undefined,
    sectionSubtitle: input.sectionSubtitle !== undefined ? trimText(input.sectionSubtitle) : undefined,
    howItHelps: normalizeTitledBodies(input.howItHelps),
    nightlySteps: normalizeTitledBodies(input.nightlySteps)
  };
}

export function normalizeTopicCopy(input: TopicCopyOverlay): TopicCopyOverlay {
  return {
    ...input,
    pill: input.pill !== undefined ? trimText(input.pill) : undefined,
    title: input.title !== undefined ? trimText(input.title) : undefined,
    metaTitle: input.metaTitle !== undefined ? trimText(input.metaTitle) : undefined,
    metaDescription: input.metaDescription !== undefined ? trimText(input.metaDescription) : undefined,
    heroLead: input.heroLead !== undefined ? trimText(input.heroLead) : undefined,
    eyebrow: input.eyebrow !== undefined ? trimText(input.eyebrow) : undefined,
    sectionTitle: input.sectionTitle !== undefined ? trimText(input.sectionTitle) : undefined,
    sectionSubtitle: input.sectionSubtitle !== undefined ? trimText(input.sectionSubtitle) : undefined,
    howItHelps: normalizeTitledBodies(input.howItHelps),
    nightlySteps: normalizeTitledBodies(input.nightlySteps)
  };
}

export function normalizeBlogCopy(input: BlogCopyOverlay): BlogCopyOverlay {
  return {
    ...input,
    title: input.title !== undefined ? trimText(input.title) : undefined,
    metaTitle: input.metaTitle !== undefined ? trimText(input.metaTitle) : undefined,
    metaDescription: input.metaDescription !== undefined ? trimText(input.metaDescription) : undefined,
    excerpt: input.excerpt !== undefined ? trimText(input.excerpt) : undefined,
    readMinutes: input.readMinutes,
    sections: input.sections?.map((section) => ({
      heading: section.heading ? trimText(section.heading) : undefined,
      paragraphs: section.paragraphs.map((paragraph) => trimText(paragraph)).filter(Boolean)
    })),
    transcriptExcerpt: input.transcriptExcerpt
      ? {
          sessionTitle: trimText(input.transcriptExcerpt.sessionTitle),
          quote: trimText(input.transcriptExcerpt.quote)
        }
      : undefined
  };
}

export function diffGoalCopy(defaults: GoalLandingContent, edited: GoalCopyOverlay): GoalCopyOverlay {
  return overlayFromChanged(
    goalEditableFields(defaults) as Record<string, unknown>,
    normalizeGoalCopy(edited) as Record<string, unknown>,
    [
      "label",
      "tagline",
      "title",
      "metaTitle",
      "metaDescription",
      "heroLead",
      "eyebrow",
      "sectionTitle",
      "sectionSubtitle",
      "howItHelps",
      "nightlySteps"
    ]
  ) as GoalCopyOverlay;
}

export function diffTopicCopy(
  defaults: TopicLandingContent,
  edited: TopicCopyOverlay
): TopicCopyOverlay {
  return overlayFromChanged(
    topicEditableFields(defaults) as Record<string, unknown>,
    normalizeTopicCopy(edited) as Record<string, unknown>,
    [
      "pill",
      "title",
      "metaTitle",
      "metaDescription",
      "heroLead",
      "eyebrow",
      "sectionTitle",
      "sectionSubtitle",
      "howItHelps",
      "nightlySteps"
    ]
  ) as TopicCopyOverlay;
}

export function diffBlogCopy(defaults: BlogPost, edited: BlogCopyOverlay): BlogCopyOverlay {
  return overlayFromChanged(
    blogEditableFields(defaults) as Record<string, unknown>,
    normalizeBlogCopy(edited) as Record<string, unknown>,
    [
      "title",
      "metaTitle",
      "metaDescription",
      "excerpt",
      "readMinutes",
      "sections",
      "transcriptExcerpt"
    ]
  ) as BlogCopyOverlay;
}

export function isEmptyOverlay(overlay: object): boolean {
  return Object.keys(overlay).length === 0;
}

async function safeListOverrides(): Promise<SiteCopyOverrideRecord[]> {
  try {
    return await listSiteCopyOverrides();
  } catch {
    return [];
  }
}

async function safeGetOverride(path: string): Promise<SiteCopyOverrideRecord | null> {
  try {
    return await getSiteCopyOverride(path);
  } catch {
    return null;
  }
}

export function findDefaultByPath(path: string): {
  kind: SiteCopyKind;
  label: string;
  slug: string;
  defaults: GoalLandingContent | TopicLandingContent | BlogPost;
} | null {
  const goal = GOAL_LANDING_PAGES.find((page) => page.path === path);
  if (goal) {
    return { kind: "goal", label: goal.label, slug: goal.slug, defaults: goal };
  }
  const topic = TOPIC_LANDING_PAGES.find((page) => page.path === path);
  if (topic) {
    return { kind: "topic", label: topic.pill, slug: topic.slug, defaults: topic };
  }
  const blogPath = path.match(/^\/blog\/([^/]+)$/);
  if (blogPath) {
    const post = BLOG_POSTS.find((item) => item.slug === blogPath[1]);
    if (post) {
      return { kind: "blog", label: post.title, slug: post.slug, defaults: post };
    }
  }
  return null;
}

export async function listSiteCopyCatalog(): Promise<SiteCopyCatalogEntry[]> {
  const overrides = await safeListOverrides();
  const byPath = new Map(overrides.map((row) => [row.path, row]));
  const entries: SiteCopyCatalogEntry[] = [];

  for (const page of GOAL_LANDING_PAGES) {
    const row = byPath.get(page.path);
    entries.push({
      kind: "goal",
      kindLabel: KIND_LABELS.goal,
      path: page.path,
      slug: page.slug,
      label: applyGoalCopyOverlay(page, row?.content as GoalCopyOverlay | undefined).label,
      customized: Boolean(row),
      updatedAt: row?.updatedAt,
      updatedBy: row?.updatedBy
    });
  }
  for (const page of TOPIC_LANDING_PAGES) {
    const row = byPath.get(page.path);
    entries.push({
      kind: "topic",
      kindLabel: KIND_LABELS.topic,
      path: page.path,
      slug: page.slug,
      label: applyTopicCopyOverlay(page, row?.content as TopicCopyOverlay | undefined).title,
      customized: Boolean(row),
      updatedAt: row?.updatedAt,
      updatedBy: row?.updatedBy
    });
  }
  const posts = [...BLOG_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  for (const post of posts) {
    const path = `/blog/${post.slug}`;
    const row = byPath.get(path);
    entries.push({
      kind: "blog",
      kindLabel: KIND_LABELS.blog,
      path,
      slug: post.slug,
      label: applyBlogCopyOverlay(post, row?.content as BlogCopyOverlay | undefined).title,
      customized: Boolean(row),
      updatedAt: row?.updatedAt,
      updatedBy: row?.updatedBy
    });
  }
  return entries;
}

export async function resolveGoalLandingPage(slug: string): Promise<GoalLandingContent | undefined> {
  const base = getGoalLandingPage(slug);
  if (!base) return undefined;
  const row = await safeGetOverride(base.path);
  return applyGoalCopyOverlay(base, row?.content as GoalCopyOverlay | undefined);
}

export async function resolveTopicLandingPage(
  slug: string
): Promise<TopicLandingContent | undefined> {
  const base = getTopicLandingPage(slug);
  if (!base) return undefined;
  const row = await safeGetOverride(base.path);
  return applyTopicCopyOverlay(base, row?.content as TopicCopyOverlay | undefined);
}

export async function resolveBlogPost(slug: string): Promise<BlogPost | undefined> {
  const base = getBlogPost(slug);
  if (!base) return undefined;
  const row = await safeGetOverride(`/blog/${base.slug}`);
  return applyBlogCopyOverlay(base, row?.content as BlogCopyOverlay | undefined);
}

export async function resolveBlogPostsNewestFirst(): Promise<BlogPost[]> {
  const posts = getBlogPostsNewestFirst();
  const overrides = await safeListOverrides();
  const byPath = new Map(overrides.map((row) => [row.path, row.content]));
  return posts.map((post) =>
    applyBlogCopyOverlay(post, byPath.get(`/blog/${post.slug}`) as BlogCopyOverlay | undefined)
  );
}

export async function resolveRelatedGoalPages(slugs: string[]): Promise<GoalLandingContent[]> {
  const overrides = await safeListOverrides();
  const byPath = new Map(overrides.map((row) => [row.path, row.content]));
  return slugs
    .map((slug) => getGoalLandingPage(slug))
    .filter((page): page is GoalLandingContent => page != null)
    .map((page) => applyGoalCopyOverlay(page, byPath.get(page.path) as GoalCopyOverlay | undefined));
}

export async function resolveRelatedTopicPages(slugs: string[]): Promise<TopicLandingContent[]> {
  const overrides = await safeListOverrides();
  const byPath = new Map(overrides.map((row) => [row.path, row.content]));
  return slugs
    .map((slug) => getTopicLandingPage(slug))
    .filter((page): page is TopicLandingContent => page != null)
    .map((page) =>
      applyTopicCopyOverlay(page, byPath.get(page.path) as TopicCopyOverlay | undefined)
    );
}

export async function saveSiteCopy(
  path: string,
  edited: SiteCopyOverlay,
  updatedBy: string | null
): Promise<{ overlay: SiteCopyOverlay; customized: boolean }> {
  const found = findDefaultByPath(path);
  if (!found) {
    throw new Error("Unknown page.");
  }
  let overlay: SiteCopyOverlay;
  if (found.kind === "goal") {
    overlay = diffGoalCopy(found.defaults as GoalLandingContent, edited as GoalCopyOverlay);
  } else if (found.kind === "topic") {
    overlay = diffTopicCopy(found.defaults as TopicLandingContent, edited as TopicCopyOverlay);
  } else {
    overlay = diffBlogCopy(found.defaults as BlogPost, edited as BlogCopyOverlay);
  }
  if (isEmptyOverlay(overlay)) {
    await deleteSiteCopyOverride(path);
    return { overlay: {}, customized: false };
  }
  await upsertSiteCopyOverride({
    path,
    kind: found.kind,
    content: overlay as Record<string, unknown>,
    updatedBy
  });
  return { overlay, customized: true };
}

export async function resetSiteCopy(path: string): Promise<boolean> {
  if (!findDefaultByPath(path)) {
    throw new Error("Unknown page.");
  }
  return deleteSiteCopyOverride(path);
}
