import { normalizeResendEventType } from "./resend-webhook";

describe("resend-webhook", () => {
  it("normalizes bounce and complaint event types", () => {
    expect(normalizeResendEventType("email.bounced")).toBe("bounced");
    expect(normalizeResendEventType("email.complained")).toBe("complained");
    expect(normalizeResendEventType("email.delivered")).toBeNull();
    expect(normalizeResendEventType(undefined)).toBeNull();
  });
});
