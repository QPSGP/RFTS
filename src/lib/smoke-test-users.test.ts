import {
  isLikelySmokeTestEmail,
  isLikelySmokeTestProfile,
  shouldSkipWelcomeStaffCc,
  SMOKE_TEST_USER_MIN_AGE_DAYS
} from "./smoke-test-users";

describe("smoke-test-users", () => {
  it("uses one-day retention for cron cleanup", () => {
    expect(SMOKE_TEST_USER_MIN_AGE_DAYS).toBe(1);
  });

  it("detects automated test email patterns", () => {
    expect(isLikelySmokeTestEmail("rfts-smoke-123@example.invalid")).toBe(true);
    expect(isLikelySmokeTestEmail("rfts-probe-1@example.invalid")).toBe(true);
    expect(isLikelySmokeTestEmail("member@reachforthestars.today")).toBe(false);
  });

  it("detects smoke-test profile markers", () => {
    expect(isLikelySmokeTestProfile("Smoke", "Test", "smoke-test")).toBe(true);
    expect(isLikelySmokeTestProfile("Jane", "Doe", "friend")).toBe(false);
  });

  it("skips welcome staff CC for smoke testers only", () => {
    expect(
      shouldSkipWelcomeStaffCc({ memberEmail: "rfts-smoke-1@example.invalid" })
    ).toBe(true);
    expect(
      shouldSkipWelcomeStaffCc({
        memberEmail: "jane@example.com",
        referralSource: "smoke-test"
      })
    ).toBe(true);
    expect(
      shouldSkipWelcomeStaffCc({
        memberEmail: "jane@example.com",
        firstName: "Jane",
        lastName: "Doe"
      })
    ).toBe(false);
  });
});
