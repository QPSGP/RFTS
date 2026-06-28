jest.mock("@/lib/email", () => ({
  getBaseUrl: () => "https://reachforthestars.today"
}));

import {
  getWelcomeEmailContent,
  WELCOME_EMAIL_PLATINUM_MANAGED_COPY,
  welcomeEmailHasUpdatedPlatinumCopy
} from "./email-templates";

describe("welcome email templates", () => {
  it("uses curated guided meditations in Platinum Managed copy", () => {
    expect(WELCOME_EMAIL_PLATINUM_MANAGED_COPY).toContain("curated guided meditations");
    expect(WELCOME_EMAIL_PLATINUM_MANAGED_COPY).not.toContain("curated sessions");
  });

  it("includes updated Platinum Managed copy in welcome email", () => {
    const welcome = getWelcomeEmailContent("Smoke", "Test");
    expect(welcomeEmailHasUpdatedPlatinumCopy(welcome)).toBe(true);
    expect(welcome.text).toContain(WELCOME_EMAIL_PLATINUM_MANAGED_COPY);
    expect(welcome.html).toContain("curated guided meditations");
    expect(welcome.text).not.toContain("curated sessions");
  });
});
