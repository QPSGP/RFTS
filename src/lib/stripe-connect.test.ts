import { parseStripeConnectStatus } from "./stripe-connect";

describe("parseStripeConnectStatus", () => {
  it("returns not ready when account is null", () => {
    const status = parseStripeConnectStatus(null);
    expect(status.readyForTransfers).toBe(false);
    expect(status.accountId).toBeNull();
  });

  it("requires transfers active, details submitted, and payouts enabled", () => {
    const ready = parseStripeConnectStatus({
      id: "acct_123",
      details_submitted: true,
      payouts_enabled: true,
      capabilities: { transfers: "active" }
    } as never);
    expect(ready.readyForTransfers).toBe(true);

    const pending = parseStripeConnectStatus({
      id: "acct_123",
      details_submitted: true,
      payouts_enabled: false,
      capabilities: { transfers: "active" }
    } as never);
    expect(pending.readyForTransfers).toBe(false);
  });
});
