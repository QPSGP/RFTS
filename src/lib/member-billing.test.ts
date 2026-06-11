import {
  formatSubscriptionStatus,
  getSubscriptionTierLabel,
  isStripeBillingConfigured
} from "./member-billing";

describe("member-billing helpers", () => {
  it("labels subscription tiers", () => {
    expect(getSubscriptionTierLabel("platinum")).toBe("Membership");
    expect(getSubscriptionTierLabel("platinum_managed")).toBe("Platinum Managed");
    expect(getSubscriptionTierLabel(null)).toBe("Membership");
  });

  it("formats subscription status", () => {
    expect(formatSubscriptionStatus("active")).toBe("Active");
    expect(formatSubscriptionStatus("inactive")).toBe("Inactive");
    expect(formatSubscriptionStatus("past_due")).toBe("Past due");
    expect(formatSubscriptionStatus(null)).toBe("Unknown");
  });

  it("detects when Stripe billing is not configured", () => {
    const prevKey = process.env.STRIPE_SECRET_KEY;
    const prevSkip = process.env.DEMO_SKIP_STRIPE;
    process.env.STRIPE_SECRET_KEY = "";
    process.env.DEMO_SKIP_STRIPE = "false";
    expect(isStripeBillingConfigured()).toBe(false);
    process.env.STRIPE_SECRET_KEY = prevKey;
    process.env.DEMO_SKIP_STRIPE = prevSkip;
  });
});
