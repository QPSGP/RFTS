import {
  didCrossPayoutThreshold,
  getAffiliateNotificationCcRecipients
} from "./affiliate-payout";

describe("affiliate payout notifications config", () => {
  it("didCrossPayoutThreshold detects first crossing only", () => {
    expect(didCrossPayoutThreshold(2400, 2500, 2500)).toBe(true);
    expect(didCrossPayoutThreshold(2500, 2600, 2500)).toBe(false);
    expect(didCrossPayoutThreshold(0, 2500, 2500)).toBe(true);
    expect(didCrossPayoutThreshold(2499, 2500, 2500)).toBe(true);
  });

  it("defaults affiliate CC to Richard", () => {
    delete process.env.AFFILIATE_EMAIL_CC;
    expect(getAffiliateNotificationCcRecipients()).toEqual([
      "Richard@richardleeweatherman.com"
    ]);
  });
});
