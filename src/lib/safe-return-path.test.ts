import { safeReturnPath } from "@/lib/safe-return-path";

describe("safeReturnPath", () => {
  it("keeps a normal site path", () => {
    expect(safeReturnPath("/play-options")).toBe("/play-options");
  });

  it("drops paths that leave the site", () => {
    expect(safeReturnPath("https://evil.example/phish")).toBe("/");
    expect(safeReturnPath("//evil.example")).toBe("/");
    expect(safeReturnPath(".evil.example")).toBe("/");
    expect(safeReturnPath("/@evil.example")).toBe("/");
  });
});
