import {
  findOutreachCopyProblems,
  formatOutreachCopyBlockReason,
  hasIncompleteOutreachCopy
} from "./outreach-copy-check";

describe("outreach copy check", () => {
  it("allows a complete merged draft", () => {
    expect(
      hasIncompleteOutreachCopy(
        "Partnership idea: Reach For The Stars for your community",
        "Hello Jane Doe,\n\nHappy to share a short overview, a free-trial path for your community, and sample messaging you can share.\n"
      )
    ).toBe(false);
  });

  it("flags leftover merge tokens", () => {
    const problems = findOutreachCopyProblems(
      "Hi {{firstName}}",
      "Hello {{contactName}},\nSee {{siteUrl}}/signup/step-1-subscription-selection"
    );
    expect(problems.map((p) => p.token).sort()).toEqual(["contactName", "firstName", "siteUrl"]);
    expect(formatOutreachCopyBlockReason(problems)).toContain("How to fix:");
  });

  it("flags an empty greeting and a comma subject", () => {
    const problems = findOutreachCopyProblems(
      ", imagine the best you",
      "Hello ,\n\nTry the trial tonight."
    );
    expect(problems.some((p) => p.kind === "empty_greeting")).toBe(true);
    expect(problems.some((p) => p.kind === "empty_subject_name")).toBe(true);
  });

  it("flags a dangling 'for .' hole", () => {
    const problems = findOutreachCopyProblems(
      "Partnership idea",
      "Happy to share a short overview, a free-trial path for your community, and sample messaging for ."
    );
    expect(problems.some((p) => p.kind === "dangling_preposition")).toBe(true);
  });

  it("flags a relative link that lost its site URL", () => {
    const problems = findOutreachCopyProblems(
      "Try tonight",
      "Open your console: /play-options"
    );
    expect(problems.some((p) => p.kind === "missing_site_url")).toBe(true);
  });
});
