import { getBlogCadenceStatus, getNextWeeklyTopic } from "./blog-weekly-plan";

describe("blog-weekly-plan", () => {
  it("suggests next topic from rotation", () => {
    const topic = getNextWeeklyTopic(6);
    expect(topic.label).toBeTruthy();
    expect(topic.path.startsWith("/")).toBe(true);
  });

  it("marks cadence due when latest post is older than 7 days", () => {
    const status = getBlogCadenceStatus([
      {
        slug: "old",
        title: "Old post",
        metaTitle: "Old",
        metaDescription: "Old",
        publishedAt: "2020-01-01",
        readMinutes: 4,
        excerpt: "Old",
        sections: [{ paragraphs: ["x"] }],
        transcriptExcerpt: { sessionTitle: "s", quote: "q" }
      }
    ]);
    expect(status.due).toBe(true);
    expect(status.signupPath).toBe("/signup/step-1-subscription-selection");
  });
});
