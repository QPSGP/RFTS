import {
  buildMemberReferralUrl,
  generateAffiliateCode,
  normalizeAffiliateCode
} from "./affiliate-code";

describe("affiliate-code", () => {
  it("normalizes valid codes", () => {
    expect(normalizeAffiliateCode("abc12")).toBe("ABC12");
    expect(normalizeAffiliateCode("  abcd1234  ")).toBe("ABCD1234");
  });

  it("rejects invalid codes", () => {
    expect(normalizeAffiliateCode("ab")).toBeNull();
    expect(normalizeAffiliateCode("bad-code")).toBeNull();
  });

  it("builds referral signup URLs", () => {
    const url = buildMemberReferralUrl("ABCD1234", "https://reachforthestars.today");
    expect(url).toBe(
      "https://reachforthestars.today/signup/step-1-subscription-selection?ref=ABCD1234"
    );
  });

  it("generates uppercase hex codes", () => {
    const code = generateAffiliateCode();
    expect(code).toMatch(/^[A-F0-9]{8}$/);
  });
});
