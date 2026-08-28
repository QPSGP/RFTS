export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  awaiting_approval: "Needs review",
  ready_to_send: "Ready to send",
  sending: "Sending",
  completed: "Sent",
  cancelled: "Cancelled"
};

export const RECIPIENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  approved: "Approved",
  sent: "Sent",
  skipped_unsubscribed: "Unsubscribed",
  skipped_converted: "Converted",
  skipped_no_email: "No email",
  error: "Error"
};

export const CAMPAIGN_FILTERS = [
  { id: "needs_action", label: "Needs action" },
  { id: "aweber", label: "AWeber" },
  { id: "ready", label: "Ready to send" },
  { id: "sent", label: "Sent" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" }
] as const;

export type CampaignFilterId = (typeof CAMPAIGN_FILTERS)[number]["id"];

const NEEDS_ACTION = new Set(["draft", "awaiting_approval", "ready_to_send", "sending"]);

export function campaignStatusLabel(status: string): string {
  return CAMPAIGN_STATUS_LABELS[status] || status.replace(/_/g, " ");
}

export function recipientStatusLabel(status: string): string {
  return RECIPIENT_STATUS_LABELS[status] || status.replace(/_/g, " ");
}

export function campaignNeedsAction(status: string): boolean {
  return NEEDS_ACTION.has(status);
}

export function isAweberCampaignName(name: string): boolean {
  return name.toLowerCase().includes("aweber");
}

export function campaignMatchesFilter(
  campaign: { status: string; name: string },
  filter: CampaignFilterId
): boolean {
  if (filter === "all") return true;
  if (filter === "aweber") return isAweberCampaignName(campaign.name);
  if (filter === "needs_action") return campaignNeedsAction(campaign.status);
  if (filter === "ready") return campaign.status === "ready_to_send";
  if (filter === "sent") return campaign.status === "completed";
  if (filter === "cancelled") return campaign.status === "cancelled";
  return true;
}

export function campaignStatusTone(status: string): { background: string; color: string } {
  if (status === "completed") return { background: "#ecfdf5", color: "#047857" };
  if (status === "ready_to_send") return { background: "#eff6ff", color: "#1d4ed8" };
  if (status === "sending") return { background: "#f5f3ff", color: "#6d28d9" };
  if (status === "cancelled") return { background: "#f3f4f6", color: "#4b5563" };
  return { background: "#fffbeb", color: "#b45309" };
}
