import {
  appendReportIssueContext,
  formatReportIssueContextBlock,
  type ClientDiagnosticContext,
  type MemberReportServerContext
} from "@/lib/report-issue-context";

describe("report-issue-context", () => {
  const server: MemberReportServerContext = {
    memberEmail: "partial2pedagogy@gmail.com",
    memberId: "user-123",
    subscriptionTier: "platinum",
    subscriptionStatus: "active",
    playsPerNight: 2,
    goalCount: 5,
    firstName: "Ariel",
    lastName: "Reynante"
  };

  const client: ClientDiagnosticContext = {
    pageUrl: "https://reachforthestars.today/member/report-issue",
    userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/138.0.0.0 Mobile",
    platform: "Linux armv81",
    language: "en-US",
    timeZone: "America/Los_Angeles",
    screen: "412×915 @2.625x",
    viewport: "412×783",
    deviceMemoryGb: 4,
    hardwareConcurrency: 8,
    touchPoints: 5,
    standalonePwa: false,
    collectedAt: "2026-07-06T12:00:00.000Z"
  };

  it("includes account and device details in the context block", () => {
    const block = formatReportIssueContextBlock(server, client);
    expect(block).toContain("partial2pedagogy@gmail.com");
    expect(block).toContain("Plays per night: 2");
    expect(block).toContain("User-Agent:");
    expect(block).toContain("Android 14");
  });

  it("appends context after the member message", () => {
    const full = appendReportIssueContext("Second audio did not start.", server, client);
    expect(full.startsWith("Second audio did not start.")).toBe(true);
    expect(full).toContain("--- Automatic diagnostic context ---");
  });
});
