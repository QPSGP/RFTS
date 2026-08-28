import {
  CAMPAIGN_FILTERS,
  campaignMatchesFilter,
  campaignNeedsAction,
  campaignStatusLabel,
  recipientStatusLabel
} from "./outreach-campaign-ui";

describe("outreach campaign UI labels", () => {
  it("uses readable campaign statuses", () => {
    expect(campaignStatusLabel("awaiting_approval")).toBe("Needs review");
    expect(campaignStatusLabel("ready_to_send")).toBe("Ready to send");
    expect(campaignStatusLabel("completed")).toBe("Sent");
  });

  it("uses readable recipient statuses", () => {
    expect(recipientStatusLabel("skipped_converted")).toBe("Converted");
    expect(recipientStatusLabel("skipped_unsubscribed")).toBe("Unsubscribed");
  });

  it("groups needs-action campaigns", () => {
    expect(campaignNeedsAction("awaiting_approval")).toBe(true);
    expect(campaignNeedsAction("ready_to_send")).toBe(true);
    expect(campaignNeedsAction("completed")).toBe(false);
    expect(campaignMatchesFilter({ status: "awaiting_approval", name: "AWeber · Test" }, "needs_action")).toBe(true);
    expect(campaignMatchesFilter({ status: "completed", name: "AWeber · Test" }, "sent")).toBe(true);
    expect(campaignMatchesFilter({ status: "cancelled", name: "AWeber · Test" }, "sent")).toBe(false);
    expect(campaignMatchesFilter({ status: "awaiting_approval", name: "AWeber · Clients Grow" }, "aweber")).toBe(
      true
    );
    expect(campaignMatchesFilter({ status: "awaiting_approval", name: "CRM query" }, "aweber")).toBe(false);
    expect(CAMPAIGN_FILTERS.map((f) => f.id)).toContain("aweber");
  });
});
