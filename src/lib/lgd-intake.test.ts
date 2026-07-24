import {
  emptyLgdIntakeAnswers,
  findLgdContradictionNotes,
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
});
