import {
  emptyLgdIntakeAnswers,
  findLgdContradictionNotes,
  normalizeLgdIntakeAnswers,
  normalizeSevenKeysOrder,
  orderedLgdSevenKeys,
  prioritizedLgdChallenges,
  resolveFrequencyBedId
} from "@/lib/lgd-intake";

describe("lgd-intake helpers", () => {
  it("resolves choose_for_me from lowest life area", () => {
    const answers = emptyLgdIntakeAnswers();
    answers.frequencyBedId = "choose_for_me";
    answers.lifeAreaScores = { financial: 2, physical: 8 };
    expect(resolveFrequencyBedId(answers)).toBe("abundance_warm");
  });

  it("keeps an explicit bed selection", () => {
    const answers = emptyLgdIntakeAnswers();
    answers.frequencyBedId = "focus_clarity";
    expect(resolveFrequencyBedId(answers)).toBe("focus_clarity");
  });

  it("flags spiritual none with financial focus", () => {
    const answers = emptyLgdIntakeAnswers();
    answers.spiritualLanguage = "none";
    answers.incomeDesiredBand = "six figures";
    const notes = findLgdContradictionNotes(answers);
    expect(notes.some((n) => n.toLowerCase().includes("spiritual"))).toBe(true);
  });

  it("keeps challenge priority as an ordered subset of checked challenges", () => {
    const answers = normalizeLgdIntakeAnswers({
      challengeIds: ["sleep_issues", "raise_income", "public_speaking", "bogus"],
      challengePriority: ["raise_income", "bogus", "sleep_issues", "raise_income"]
    });
    expect(answers.challengeIds).toEqual([
      "sleep_issues",
      "raise_income",
      "public_speaking"
    ]);
    expect(answers.challengePriority).toEqual(["raise_income", "sleep_issues"]);
    expect(prioritizedLgdChallenges(answers).map((c) => c.label)).toEqual([
      "Raise income / earning power",
      "Sleep issues"
    ]);
  });

  it("keeps Bronze first in Seven Keys order", () => {
    expect(normalizeSevenKeysOrder(["platinum", "bronze", "gold", "bronze"])).toEqual([
      "bronze",
      "platinum",
      "gold"
    ]);
    expect(normalizeSevenKeysOrder([])).toEqual(["bronze"]);
    const ordered = orderedLgdSevenKeys({
      sevenKeysOrder: ["ruby", "silver"]
    });
    expect(ordered.map((k) => k.id)).toEqual(["bronze", "ruby", "silver"]);
    expect(ordered[0].metal).toBe("Bronze");
  });
});
