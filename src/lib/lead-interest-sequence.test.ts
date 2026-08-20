import {
  extractLeadGoalInterests,
  planInterestSequence,
  templateNameForInterest
} from "./lead-interest-sequence";

describe("lead interest sequence", () => {
  it("extracts goal checkboxes from practice and consumer payloads", () => {
    expect(
      extractLeadGoalInterests(
        {
          practice: { goalInterests: ["Sleep Well", "Raise Income"] },
          consumer: { goalInterests: ["Sleep Well", "Stress Management"] }
        },
        "Health, Sleep Well"
      )
    ).toEqual(["Sleep Well", "Raise Income", "Stress Management", "Health"]);
  });

  it("maps lead-card boxes to Convert lead card templates", () => {
    expect(templateNameForInterest("Raise Income")).toBe(
      "Convert lead card - Raise Income"
    );
    expect(templateNameForInterest("Health")).toBe("Convert interest - Health");
    expect(templateNameForInterest("Reduced Stress")).toBe(
      "Convert interest - Stress relief"
    );
  });

  it("dedupes overlapping templates and keeps checkbox order", () => {
    const plan = planInterestSequence([
      "Sleep Well",
      "Better Sleep",
      "Raise Income",
      "Wealth"
    ]);
    expect(plan.map((s) => s.templateName)).toEqual([
      "Convert lead card - Sleep Well",
      "Convert interest - Sleep",
      "Convert lead card - Raise Income",
      "Convert interest - Wealth"
    ]);
  });
});
