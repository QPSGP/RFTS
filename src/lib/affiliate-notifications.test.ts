import { didCrossPayoutThreshold } from "./affiliate-payout";
import { defaultEmailsForList } from "./email-staff-lists";

describe("affiliate payout notifications config", () => {
  it("didCrossPayoutThreshold detects first crossing only", () => {
    expect(didCrossPayoutThreshold(2400, 2500, 2500)).toBe(true);
    expect(didCrossPayoutThreshold(2500, 2600, 2500)).toBe(false);
    expect(didCrossPayoutThreshold(0, 2500, 2500)).toBe(true);
    expect(didCrossPayoutThreshold(2499, 2500, 2500)).toBe(true);
  });

  it("defaults affiliate CC seed to Richard when env unset", () => {
    const prev = process.env.AFFILIATE_EMAIL_CC;
    delete process.env.AFFILIATE_EMAIL_CC;
    expect(defaultEmailsForList("affiliate_cc")).toEqual([
      "Richard@richardleeweatherman.com"
    ]);
    if (prev === undefined) delete process.env.AFFILIATE_EMAIL_CC;
    else process.env.AFFILIATE_EMAIL_CC = prev;
  });
});
