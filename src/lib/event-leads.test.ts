import {
  SARAH_ROSE_LONG_BEACH_EXTRACT,
  applyLeadDefaults,
  eventLeadSubmitSchema,
  normalizeLeadEmail,
  normalizeLeadPhone,
  splitLeadName
} from "./event-leads";

describe("event-leads", () => {
  it("normalizes spaced handwritten emails", () => {
    expect(normalizeLeadEmail("Sarahrose Healing @ Gmail . com")).toBe(
      "sarahrosehealing@gmail.com"
    );
  });

  it("normalizes US phone numbers", () => {
    expect(normalizeLeadPhone("9096315026")).toBe("909-631-5026");
    expect(normalizeLeadPhone("909-631-5026")).toBe("909-631-5026");
  });

  it("splits full names", () => {
    expect(splitLeadName("Sarah Rose")).toEqual({
      firstName: "Sarah",
      lastName: "Rose"
    });
  });

  it("applies Chris / Expo defaults for practice surveys", () => {
    const lead = applyLeadDefaults({
      formType: "practice_survey",
      eventName: "Holistic Healing Expo - Long Beach",
      fullName: "Sarah Rose",
      email: "sarahrosehealing@gmail.com"
    });
    expect(lead.persona).toBe("Chris - Spiritual Entrepreneur");
    expect(lead.category).toBe("Coaches, studios & practitioners");
    expect(lead.firstName).toBe("Sarah");
    expect(lead.lastName).toBe("Rose");
  });

  it("includes verified Long Beach scan extract fields", () => {
    expect(SARAH_ROSE_LONG_BEACH_EXTRACT.email).toBe("sarahrosehealing@gmail.com");
    expect(SARAH_ROSE_LONG_BEACH_EXTRACT.practice?.incomeGoalAmount).toBe("40000");
    expect(SARAH_ROSE_LONG_BEACH_EXTRACT.persona).toContain("Chris");
  });

  it("rejects invalid emails after cleanup", () => {
    expect(normalizeLeadEmail("not-an-email")).toBeNull();
    expect(normalizeLeadEmail("missing-tld@gmail")).toBeNull();
    expect(normalizeLeadEmail("")).toBeNull();
  });

  it("rejects schema when email is present but invalid", () => {
    const parsed = eventLeadSubmitSchema.safeParse({
      formType: "practice_survey",
      eventName: "Expo",
      fullName: "Test Lead",
      email: "not-valid"
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts null practice/consumer payloads from vision extracts", () => {
    const parsed = eventLeadSubmitSchema.safeParse({
      formType: "consumer_lead",
      eventName: "Holistic Healing Expo - Long Beach",
      fullName: "Test Lead",
      email: "test@example.com",
      practice: null,
      consumer: null
    });
    expect(parsed.success).toBe(true);
  });
});
