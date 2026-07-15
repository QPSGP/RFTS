jest.mock("@/lib/email", () => ({
  getBaseUrl: () => "https://reachforthestars.today"
}));

import {
  getForgotPasswordEmailContent,
  getLgdInterestEmailContent,
  getTherapistHealerCoachEmailContent,
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

describe("Gmail-safe email HTML", () => {
  const samples = [
    getWelcomeEmailContent("Smoke", "Test"),
    getForgotPasswordEmailContent("https://reachforthestars.today/reset", 2),
    getLgdInterestEmailContent("Smoke"),
    getTherapistHealerCoachEmailContent("Smoke")
  ];

  it("uses table layout, Arial, and bgcolor CTA buttons", () => {
    for (const sample of samples) {
      expect(sample.html).toContain('role="presentation"');
      expect(sample.html).toContain("Arial, Helvetica, sans-serif");
      expect(sample.html).toContain('bgcolor="#0f766e"');
      expect(sample.html).not.toContain("system-ui");
    }
  });
});
