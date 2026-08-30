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

  it("rewrites empty-org partner sentences so they stay complete", () => {
    const merged = mergeOutreachTemplate(
      "Many {{organization}} members juggle stress.\nOpen to a short intro call for {{organization}}?",
      { organization: "" }
    );
    expect(merged).toContain("People you work with often juggle");
    expect(merged).toContain("Open to a short intro call?");
  });

  it("keeps Many {{organization}} members when an org name is present", () => {
    expect(
      mergeOutreachTemplate("Many {{organization}} members juggle stress.", {
        organization: "Acme Wellness"
      })
    ).toBe("Many Acme Wellness members juggle stress.");
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
  it("do not trail off on {{persona}} or {{organization}}", () => {
    const bodies = STARTER_OUTREACH_EMAIL_TEMPLATES.map((t) => t.bodyText).join("\n");
    expect(bodies).not.toMatch(/sample messaging for \{\{persona\}\}/);
    expect(bodies).toContain("sample messaging you can share.");
    expect(bodies).not.toContain("{{organization}}");
  });
});
