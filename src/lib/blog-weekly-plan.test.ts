import {
  BLOG_POSTS_PER_WEEK,
  countPublishedInWeek,
  expectedPostsByWeekday,
  getBlogCadenceStatus,
  getNextWeeklyTopic,
  startOfUtcWeek
} from "./blog-weekly-plan";
import type { BlogPost } from "./blog-posts";

function stubPost(publishedAt: string, slug = publishedAt): BlogPost {
  return {
    slug,
    title: `Post ${slug}`,
    metaTitle: "t",
    metaDescription: "d",
    publishedAt,
    readMinutes: 4,
    excerpt: "e",
    sections: [{ paragraphs: ["x"] }],
    transcriptExcerpt: { sessionTitle: "s", quote: "q" }
  };
}

describe("blog-weekly-plan", () => {
  it("suggests next topic from rotation", () => {
    const topic = getNextWeeklyTopic(6);
    expect(topic.label).toBeTruthy();
    expect(topic.path.startsWith("/")).toBe(true);
  });

  it("starts week on Monday UTC", () => {
    const start = startOfUtcWeek(new Date("2026-08-05T15:00:00.000Z"));
    expect(start.toISOString().slice(0, 10)).toBe("2026-08-03");
  });

  it("expects pace milestones during the week", () => {
    expect(expectedPostsByWeekday(1)).toBe(1);
    expect(expectedPostsByWeekday(3)).toBe(2);
    expect(expectedPostsByWeekday(5)).toBe(BLOG_POSTS_PER_WEEK);
    expect(expectedPostsByWeekday(0)).toBe(BLOG_POSTS_PER_WEEK);
  });

  it("counts only posts in the current UTC week", () => {
    const now = new Date("2026-08-05T12:00:00.000Z");
    const count = countPublishedInWeek(
      [stubPost("2026-08-03"), stubPost("2026-07-28"), stubPost("2026-08-04")],
      now
    );
    expect(count).toBe(2);
  });

  it("marks cadence due when behind expected weekly pace", () => {
    const wed = new Date("2026-08-05T12:00:00.000Z");
    const status = getBlogCadenceStatus([stubPost("2026-08-03", "one")], wed);
    expect(status.publishedThisWeek).toBe(1);
    expect(status.expectedByToday).toBe(2);
    expect(status.due).toBe(true);
    expect(status.message).toMatch(/late/i);
    expect(status.signupPath.startsWith("/signup/step-1-subscription-selection")).toBe(true);
  });

  it("is on pace when meeting expected count", () => {
    const wed = new Date("2026-08-05T12:00:00.000Z");
    const status = getBlogCadenceStatus(
      [stubPost("2026-08-04", "two"), stubPost("2026-08-03", "one")],
      wed
    );
    expect(status.due).toBe(false);
    expect(status.message).toMatch(/On pace/i);
  });
});
