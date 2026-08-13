import { GOAL_LANDING_PAGES } from "@/lib/goal-landing-pages";
import {
  MEMBER_CONVERSION_EMAIL_TEMPLATES,
  MEMBER_CONVERT_ALL_INTERESTS_EMAIL,
  MEMBER_CONVERT_NURTURE_EMAILS
} from "@/lib/member-conversion-emails";
import { TOPIC_LANDING_PAGES } from "@/lib/topic-landing-pages";

const allBodies = MEMBER_CONVERSION_EMAIL_TEMPLATES.map((t) => t.bodyText).join("\n");
const allText = MEMBER_CONVERSION_EMAIL_TEMPLATES.map(
  (t) => `${t.name}\n${t.subject}\n${t.bodyText}`
).join("\n");

describe("member conversion emails", () => {
  it("covers every goal landing path", () => {
    for (const page of GOAL_LANDING_PAGES) {
      expect(allBodies).toContain(`{{siteUrl}}${page.path}`);
    }
  });

  it("covers every wellness landing path", () => {
    for (const page of TOPIC_LANDING_PAGES) {
      expect(allBodies).toContain(`{{siteUrl}}${page.path}`);
    }
  });

  it("covers campaign and core marketing pages", () => {
    for (const path of [
      "/landing/best-you",
      "/landing/contracts",
      "/how-it-works",
      "/science",
      "/faqs",
      "/signup/step-1-subscription-selection"
    ]) {
      expect(allBodies).toContain(`{{siteUrl}}${path}`);
    }
  });

  it("puts every unique landing in the all-interests menu plus nurture sequence", () => {
    const menuAndNurture = [
      MEMBER_CONVERT_ALL_INTERESTS_EMAIL.bodyText,
      ...MEMBER_CONVERT_NURTURE_EMAILS.map((e) => e.bodyText)
    ].join("\n");
    const uniquePaths = [
      ...GOAL_LANDING_PAGES.map((p) => p.path),
      ...TOPIC_LANDING_PAGES.map((p) => p.path),
      "/landing/best-you",
      "/landing/contracts",
      "/how-it-works",
      "/science",
      "/faqs"
    ];
    for (const path of uniquePaths) {
      expect(menuAndNurture).toContain(`{{siteUrl}}${path}`);
    }
  });

  it("does not use em dashes", () => {
    expect(allText).not.toContain("\u2014");
  });

  it("uses unique template names and purposes", () => {
    const names = MEMBER_CONVERSION_EMAIL_TEMPLATES.map((t) => t.name);
    const purposes = MEMBER_CONVERSION_EMAIL_TEMPLATES.map((t) => t.purpose);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(purposes).size).toBe(purposes.length);
  });
});
