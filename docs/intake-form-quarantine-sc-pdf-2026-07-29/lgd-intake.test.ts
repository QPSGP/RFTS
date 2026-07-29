import {
  emptyLgdIntakeAnswers,
  findLgdContradictionNotes,
  normalizeLgdIntakeAnswers,
  formatLgdHorizonGoals,
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
      challengeIds: ["difficulty_falling_asleep", "raise_income", "public_speaking", "bogus"],
      challengePriority: ["raise_income", "bogus", "difficulty_falling_asleep", "raise_income"]
    });
    expect(answers.challengeIds).toEqual([
      "difficulty_falling_asleep",
      "raise_income",
      "public_speaking"
    ]);
    expect(answers.challengePriority).toEqual(["raise_income", "difficulty_falling_asleep"]);
    expect(prioritizedLgdChallenges(answers).map((c) => c.label)).toEqual([
      "Raise income / earning power",
      "Difficulty getting to sleep"
    ]);
  });

  it("maps legacy challenge ids (pre-v4 curated list) onto the full inventory", () => {
    const answers = normalizeLgdIntakeAnswers({
      challengeIds: ["stress_overwhelm", "sleep_issues", "weight_habits"],
      challengePriority: ["sleep_issues", "stress_overwhelm"],
      challengeDetails: {
        weight_habits: { weight: "160", desiredWeight: "150", bogusField: "ignored" }
      }
    });
    expect(answers.challengeIds).toEqual([
      "negative_reaction_to_stress",
      "difficulty_falling_asleep",
      "weight_problems"
    ]);
    expect(answers.challengePriority).toEqual([
      "difficulty_falling_asleep",
      "negative_reaction_to_stress"
    ]);
    expect(answers.challengeDetails.weight_problems).toEqual({
      weight: "160",
      desiredWeight: "150"
    });
  });

  it("normalizes clientInfo (personal & clinical fields from the paper intake form)", () => {
    const answers = normalizeLgdIntakeAnswers({
      clientInfo: {
        legalName: "  Jamie Rivers  ",
        email: " jamie@example.com ",
        currentHealthIssues: "Mild seasonal allergies",
        currentMedications: "Multivitamin",
        doctorName: "Dr. Lee",
        children: [
          { name: "Ali", age: "9", sex: "F" },
          { name: "", age: "", sex: "" }
        ],
        howHeard: ["internet", "bogus_source"],
        hypnosisAgreementAccepted: true,
        hypnosisAgreementDate: "2026-07-29"
      }
    });
    expect(answers.clientInfo.legalName).toBe("Jamie Rivers");
    expect(answers.clientInfo.email).toBe("jamie@example.com");
    expect(answers.clientInfo.currentHealthIssues).toBe("Mild seasonal allergies");
    expect(answers.clientInfo.currentMedications).toBe("Multivitamin");
    expect(answers.clientInfo.doctorName).toBe("Dr. Lee");
    expect(answers.clientInfo.children).toEqual([{ name: "Ali", age: "9", sex: "F" }]);
    expect(answers.clientInfo.howHeard).toEqual(["internet"]);
    expect(answers.clientInfo.hypnosisAgreementAccepted).toBe(true);
    expect(answers.clientInfo.hypnosisAgreementDate).toBe("2026-07-29");
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

  it("formats non-empty goal horizons", () => {
    const answers = normalizeLgdIntakeAnswers({
      shortTermGoals: "  Connect better  ",
      longTermGoals: "",
      oneYearChange: "Calm evenings",
      ultimateGoal: "Benevolent impact"
    });
    expect(formatLgdHorizonGoals(answers)).toEqual([
      { label: "Short-term", value: "Connect better" },
      { label: "One-year change", value: "Calm evenings" },
      { label: "Ultimate goal", value: "Benevolent impact" }
    ]);
  });
});
