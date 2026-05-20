import { goalIdsSequenceEqual } from "./goal-ids";

describe("goalIdsSequenceEqual", () => {
  it("matches identical sequences", () => {
    expect(goalIdsSequenceEqual(["a", "b"], ["a", "b"])).toBe(true);
  });

  it("rejects reorder or different ids", () => {
    expect(goalIdsSequenceEqual(["a", "b"], ["b", "a"])).toBe(false);
    expect(goalIdsSequenceEqual(["a"], ["a", "b"])).toBe(false);
  });
});
