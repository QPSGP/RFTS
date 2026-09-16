import { formatFullSessionsFraction, normalizePlaysPerNight } from "./session-progress-format";

describe("normalizePlaysPerNight", () => {
  it("keeps one-per-night for number or string 1", () => {
    expect(normalizePlaysPerNight(1)).toBe(1);
    expect(normalizePlaysPerNight("1")).toBe(1);
  });

  it("defaults anything else to two per night", () => {
    expect(normalizePlaysPerNight(2)).toBe(2);
    expect(normalizePlaysPerNight("2")).toBe(2);
    expect(normalizePlaysPerNight(null)).toBe(2);
    expect(normalizePlaysPerNight(undefined)).toBe(2);
  });
});

describe("formatFullSessionsFraction", () => {
  it("full session mode uses whole nights", () => {
    expect(formatFullSessionsFraction(0, 2)).toBe("0");
    expect(formatFullSessionsFraction(3, 2)).toBe("3");
  });

  it("half session mode uses unicode fractions", () => {
    expect(formatFullSessionsFraction(0, 1)).toBe("0");
    expect(formatFullSessionsFraction(1, 1)).toBe("½");
    expect(formatFullSessionsFraction(2, 1)).toBe("1");
    expect(formatFullSessionsFraction(3, 1)).toBe("1½");
    expect(formatFullSessionsFraction(4, 1)).toBe("2");
    expect(formatFullSessionsFraction(5, 1)).toBe("2½");
  });
});
