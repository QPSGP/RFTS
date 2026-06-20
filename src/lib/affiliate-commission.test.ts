import {
  AFFILIATE_COMMISSION_RATE,
  calculateAffiliateCommissionCents,
  formatUsdFromCents
} from "./affiliate-payout";

describe("affiliate-commission", () => {
  it("calculates 25% commission in cents", () => {
    expect(AFFILIATE_COMMISSION_RATE).toBe(0.25);
    expect(calculateAffiliateCommissionCents(1995)).toBe(499);
    expect(calculateAffiliateCommissionCents(0)).toBe(0);
  });

  it("formats USD from cents", () => {
    expect(formatUsdFromCents(2500)).toBe("$25.00");
    expect(formatUsdFromCents(499)).toBe("$4.99");
  });
});
