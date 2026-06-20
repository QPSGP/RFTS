import {
  formatAffiliatePayoutMethodLabel,
  getCurrentAffiliatePayoutThresholdUsd,
  normalizeAffiliatePayoutMethod,
  parseAffiliatePayoutInput,
  formatAffiliatePayoutThresholdPolicy
} from "./affiliate-payout";

describe("affiliate-payout", () => {
  it("normalizes payout methods", () => {
    expect(normalizeAffiliatePayoutMethod("paypal")).toBe("paypal");
    expect(normalizeAffiliatePayoutMethod(" PAYPAL ")).toBe("paypal");
    expect(normalizeAffiliatePayoutMethod("invalid")).toBeNull();
  });

  it("formats payout method labels", () => {
    expect(formatAffiliatePayoutMethodLabel("venmo")).toBe("Venmo");
    expect(formatAffiliatePayoutMethodLabel(null)).toBe("Not set");
  });

  it("requires payout detail except for bank_contact", () => {
    const missing = parseAffiliatePayoutInput({
      payoutMethod: "paypal",
      payoutDetail: ""
    });
    expect(missing.success).toBe(false);

    const valid = parseAffiliatePayoutInput({
      payoutMethod: "paypal",
      payoutDetail: "user@example.com"
    });
    expect(valid.success).toBe(true);

    const bank = parseAffiliatePayoutInput({
      payoutMethod: "bank_contact",
      payoutDetail: ""
    });
    expect(bank.success).toBe(true);
  });

  it("uses launch threshold during launch period", () => {
    expect(getCurrentAffiliatePayoutThresholdUsd(new Date("2026-06-01"))).toBe(25);
    expect(formatAffiliatePayoutThresholdPolicy(new Date("2026-06-01"))).toContain("$25");
    expect(formatAffiliatePayoutThresholdPolicy(new Date("2028-01-01"))).toContain("$50");
    expect(formatAffiliatePayoutThresholdPolicy(new Date("2028-01-01"))).not.toContain("$25");
  });
});
