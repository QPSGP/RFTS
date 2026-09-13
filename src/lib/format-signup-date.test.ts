import { formatSignupDate } from "./format-signup-date";

describe("formatSignupDate", () => {
  it("returns empty for missing or invalid values", () => {
    expect(formatSignupDate(null)).toBe("");
    expect(formatSignupDate(undefined)).toBe("");
    expect(formatSignupDate("")).toBe("");
    expect(formatSignupDate("not-a-date")).toBe("");
  });

  it("formats a signup timestamp as a calendar date", () => {
    const iso = "2026-09-13T12:00:00.000Z";
    expect(formatSignupDate(iso)).toBe(
      new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    );
  });
});
