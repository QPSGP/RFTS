import {
  completeEmptyPersonaMessaging,
  mergeOutreachTemplate,
  STARTER_OUTREACH_EMAIL_TEMPLATES,
  tidyMergedOutreachText
} from "./marketing-reference";

describe("mergeOutreachTemplate", () => {
  it("does not leave a dangling 'for .' when persona is empty", () => {
    const text =
      "Happy to share a short overview, a free-trial path for your community, and sample messaging for {{persona}}.";
    expect(mergeOutreachTemplate(text, { persona: "" })).toBe(
      "Happy to share a short overview, a free-trial path for your community, and sample messaging you can share."
    );
  });

  it("keeps a filled persona after 'sample messaging for'", () => {
    expect(
      mergeOutreachTemplate("and sample messaging for {{persona}}.", {
        persona: "Alex - Burned-Out Professional"
      })
    ).toBe("and sample messaging for Alex - Burned-Out Professional.");
  });

  it("collapses leftover 'for .' from any empty placeholder", () => {
    expect(tidyMergedOutreachText("Open to a short intro call for .")).toBe(
      "Open to a short intro call."
    );
  });
});

describe("completeEmptyPersonaMessaging", () => {
  it("completes merged drafts that already dropped the token", () => {
    expect(
      completeEmptyPersonaMessaging(
        "Happy to share a short overview, a free-trial path for your community, and sample messaging for ."
      )
    ).toContain("sample messaging you can share.");
  });

  it("leaves a real persona phrase alone", () => {
    const text = "Happy to set you up with a referral code and sample messaging for Alex - Burned-Out Professional.";
    expect(completeEmptyPersonaMessaging(text)).toBe(text);
  });
});

describe("starter partner templates", () => {
  it("do not trail off on {{persona}}", () => {
    const bodies = STARTER_OUTREACH_EMAIL_TEMPLATES.map((t) => t.bodyText).join("\n");
    expect(bodies).not.toMatch(/sample messaging for \{\{persona\}\}/);
    expect(bodies).toContain("sample messaging you can share.");
  });
});
