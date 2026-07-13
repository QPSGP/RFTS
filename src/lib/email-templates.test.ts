jest.mock("@/lib/email", () => ({
  getBaseUrl: () => "https://reachforthestars.today"
}));

import {
  getWelcomeEmailContent,
  WELCOME_EMAIL_PLATINUM_MANAGED_COPY,
  welcomeEmailHasUpdatedPlatinumCopy
} from "./email-templates";

describe("welcome email templates", () => {
  it("uses updated Platinum Managed benefits copy", () => {
    expect(WELCOME_EMAIL_PLATINUM_MANAGED_COPY).toContain(
      "Customized Goal Manifestation Recording"
    );
    expect(WELCOME_EMAIL_PLATINUM_MANAGED_COPY).toContain("12-month commitment");
    expect(WELCOME_EMAIL_PLATINUM_MANAGED_COPY).not.toContain("$39.95 per month");
  });

  it("includes updated Platinum Managed copy in welcome email", () => {
    const welcome = getWelcomeEmailContent("Smoke", "Test");
    expect(welcomeEmailHasUpdatedPlatinumCopy(welcome)).toBe(true);
    expect(welcome.text).toContain(WELCOME_EMAIL_PLATINUM_MANAGED_COPY);
    expect(welcome.html).toContain("Customized Goal Manifestation Recording");
    expect(welcome.text).not.toContain("$39.95 per month");
  });
});
