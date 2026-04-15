import { formatFullSessionsFraction } from "./session-progress-format";

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
