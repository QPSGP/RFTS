import {
  GOAL_LANDING_PAGES,
  getGoalLandingPage
} from "./goal-landing-pages";
import { BLOG_POSTS } from "./blog-posts";
import { TOPIC_LANDING_PAGES } from "./topic-landing-pages";
import {
  applyBlogCopyOverlay,
  applyGoalCopyOverlay,
  applyTopicCopyOverlay,
  diffBlogCopy,
  diffGoalCopy,
  findDefaultByPath,
  isEmptyOverlay,
  normalizeGoalCopy
} from "./site-copy";

describe("site copy overlays", () => {
  it("keeps default landing copy when no overlay is saved", () => {
    const health = getGoalLandingPage("health");
    expect(health).toBeTruthy();
    expect(applyGoalCopyOverlay(health!, null).title).toBe(health!.title);
    expect(applyGoalCopyOverlay(health!, {}).heroLead).toBe(health!.heroLead);
  });

  it("overrides only changed landing fields", () => {
    const health = GOAL_LANDING_PAGES.find((page) => page.slug === "health")!;
    const merged = applyGoalCopyOverlay(health, {
      title: "Nightly health practice",
      heroLead: "A shorter intro."
    });
    expect(merged.title).toBe("Nightly health practice");
    expect(merged.heroLead).toBe("A shorter intro.");
    expect(merged.metaTitle).toBe(health.metaTitle);
    expect(merged.slug).toBe("health");
    expect(merged.path).toBe("/health");
  });

  it("diffs landing edits so unchanged fields are not stored", () => {
    const health = GOAL_LANDING_PAGES.find((page) => page.slug === "health")!;
    const overlay = diffGoalCopy(health, {
      ...health,
      title: "Nightly health practice",
      heroLead: health.heroLead
    });
    expect(overlay).toEqual({ title: "Nightly health practice" });
    expect(isEmptyOverlay(diffGoalCopy(health, health))).toBe(true);
  });

  it("trims landing text before comparing", () => {
    const health = GOAL_LANDING_PAGES.find((page) => page.slug === "health")!;
    const overlay = diffGoalCopy(health, {
      ...health,
      title: `  ${health.title}  `
    });
    expect(isEmptyOverlay(overlay)).toBe(true);
    expect(normalizeGoalCopy({ title: "  Hello  " }).title).toBe("Hello");
  });

  it("replaces whole how-it-helps lists when they change", () => {
    const topic = TOPIC_LANDING_PAGES[0];
    const next = [{ title: "One", body: "Body" }];
    const merged = applyTopicCopyOverlay(topic, { howItHelps: next });
    expect(merged.howItHelps).toEqual(next);
    expect(merged.nightlySteps).toEqual(topic.nightlySteps);
  });

  it("overrides blog article text without changing the slug", () => {
    const post = BLOG_POSTS[0];
    const merged = applyBlogCopyOverlay(post, {
      title: "Edited headline",
      excerpt: "Edited excerpt"
    });
    expect(merged.slug).toBe(post.slug);
    expect(merged.publishedAt).toBe(post.publishedAt);
    expect(merged.title).toBe("Edited headline");
    expect(merged.excerpt).toBe("Edited excerpt");
    expect(merged.sections).toEqual(post.sections);
  });

  it("diffs blog sections as a whole", () => {
    const post = BLOG_POSTS[0];
    const sections = [{ heading: "New", paragraphs: ["One paragraph."] }];
    const overlay = diffBlogCopy(post, { ...blogEditable(post), sections });
    expect(overlay.sections).toEqual(sections);
    expect(overlay.title).toBeUndefined();
  });

  it("resolves known landing and blog paths only", () => {
    expect(findDefaultByPath("/health")?.kind).toBe("goal");
    expect(findDefaultByPath("/sleep-meditation")?.kind).toBe("topic");
    expect(findDefaultByPath(`/blog/${BLOG_POSTS[0].slug}`)?.kind).toBe("blog");
    expect(findDefaultByPath("/not-a-page")).toBeNull();
    expect(findDefaultByPath("/signup/step-1-subscription-selection")).toBeNull();
  });
});

function blogEditable(post: (typeof BLOG_POSTS)[number]) {
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
