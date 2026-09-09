import { firstSentence } from "./first-sentence";

describe("firstSentence", () => {
  it("returns the first sentence including its terminator", () => {
    expect(firstSentence("Sleep comfortably and wake refreshed. Then start the day.")).toBe(
      "Sleep comfortably and wake refreshed."
    );
    expect(firstSentence("Be calm! Then focus.")).toBe("Be calm!");
  });

  it("returns the full text when there is no sentence terminator", () => {
    expect(firstSentence("Sleep comfortably and wake refreshed")).toBe(
      "Sleep comfortably and wake refreshed"
    );
  });

  it("collapses whitespace and ignores empty input", () => {
    expect(firstSentence("  One sentence.  \nNext.")).toBe("One sentence.");
    expect(firstSentence("   ")).toBe("");
    expect(firstSentence("")).toBe("");
  });
});
