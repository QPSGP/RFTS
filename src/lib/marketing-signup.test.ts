import {
  buildMarketingSignupHref,
  buildMarketingSignupUrl,
  getMarketingAffiliateCode
} from "./marketing-signup";

describe("marketing-signup", () => {
  const prevPublic = process.env.NEXT_PUBLIC_MARKETING_AFFILIATE_REF;
  const prevPrivate = process.env.MARKETING_AFFILIATE_REF;

  afterEach(() => {
    if (prevPublic === undefined) {
      delete process.env.NEXT_PUBLIC_MARKETING_AFFILIATE_REF;
    } else {
      process.env.NEXT_PUBLIC_MARKETING_AFFILIATE_REF = prevPublic;
    }
    if (prevPrivate === undefined) {
      delete process.env.MARKETING_AFFILIATE_REF;
    } else {
      process.env.MARKETING_AFFILIATE_REF = prevPrivate;
    }
  });

  it("returns plain signup path when no marketing code is set", () => {
    delete process.env.NEXT_PUBLIC_MARKETING_AFFILIATE_REF;
    delete process.env.MARKETING_AFFILIATE_REF;
    expect(getMarketingAffiliateCode()).toBeNull();
    expect(buildMarketingSignupHref()).toBe("/signup/step-1-subscription-selection");
  });

  it("appends ref from NEXT_PUBLIC_MARKETING_AFFILIATE_REF", () => {
    process.env.NEXT_PUBLIC_MARKETING_AFFILIATE_REF = "abcd1234";
    expect(getMarketingAffiliateCode()).toBe("ABCD1234");
    expect(buildMarketingSignupHref()).toBe(
      "/signup/step-1-subscription-selection?ref=ABCD1234"
    );
  });

  it("builds absolute marketing signup URLs for emails", () => {
    process.env.NEXT_PUBLIC_MARKETING_AFFILIATE_REF = "TERRY01";
    expect(buildMarketingSignupUrl("https://reachforthestars.today")).toBe(
      "https://reachforthestars.today/signup/step-1-subscription-selection?ref=TERRY01"
    );
  });

  it("allows explicit override code", () => {
    delete process.env.NEXT_PUBLIC_MARKETING_AFFILIATE_REF;
    expect(buildMarketingSignupHref("partner99")).toBe(
      "/signup/step-1-subscription-selection?ref=PARTNER99"
    );
  });
});
