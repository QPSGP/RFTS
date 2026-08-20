/**
 * Query a CRM cohort, generate personalized drafts, and send after admin approval.
 * Stops remaining recipients if they convert or unsubscribe.
 */
import {
  createOutreachActivity,
  getOutreachContact,
  getOutreachTarget,
  getUserByEmail,
  listAllOutreachContacts,
  listOutreachEmailTemplates,
  listOutreachTargets,
  updateOutreachTarget,
  type OutreachEmailTemplate
} from "@/lib/db";
import { getBaseUrl, sendEmail } from "@/lib/email";
import { buildFlatContactRows, type FlatCrmRow } from "@/lib/crm-export";
import {
  filterCrmContactRows,
  groupRowsBySuggestedTemplate,
  suggestedProcessForRow,
  type CrmContactQuery
} from "@/lib/crm-query";
import { mergeOutreachTemplate } from "@/lib/marketing-reference";
import { MEMBER_CONVERSION_EMAIL_TEMPLATES } from "@/lib/member-conversion-emails";
import {
  createOutreachCampaign,
  createOutreachCampaignRecipient,
  getOutreachCampaign,
  getOutreachCampaignRecipient,
  listOpenCampaignRecipientsByEmail,
  listOpenCampaignRecipientsByTarget,
  listOutreachCampaignRecipients,
  listOutreachCampaigns,
  updateOutreachCampaign,
  updateOutreachCampaignRecipient,
  type OutreachCampaign,
  type OutreachCampaignRecipient,
  type OutreachCampaignRecipientStatus
} from "@/lib/outreach-campaigns-db";

export const CAMPAIGN_MAX_RECIPIENTS = 200;

const PROCESSABLE_STATUSES = new Set(["prospect", "process_chosen"]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function resolveCampaignTemplate(
  name: string,
  dbTemplates: OutreachEmailTemplate[]
): { id: string | null; name: string; subject: string; bodyText: string } | null {
  const key = name.trim().toLowerCase();
  const db = dbTemplates.find((t) => t.name.trim().toLowerCase() === key);
  if (db) {
    return { id: db.id, name: db.name, subject: db.subject, bodyText: db.bodyText };
  }
  const code = MEMBER_CONVERSION_EMAIL_TEMPLATES.find(
    (t) => t.name.trim().toLowerCase() === key
  );
  if (!code) return null;
  return { id: null, name: code.name, subject: code.subject, bodyText: code.bodyText };
}

export async function loadCrmContactRows(): Promise<FlatCrmRow[]> {
  const [targets, contacts] = await Promise.all([
    listOutreachTargets(),
    listAllOutreachContacts()
  ]);
  return buildFlatContactRows(targets, contacts);
}

export async function queryCrmContacts(query: CrmContactQuery): Promise<FlatCrmRow[]> {
  const rows = await loadCrmContactRows();
  return filterCrmContactRows(rows, query);
}

function uniqueKey(row: FlatCrmRow): string | null {
  if (row.contactId) return `c:${row.contactId}`;
  if (row.email) return `e:${row.email.trim().toLowerCase()}`;
  return `t:${row.targetId}`;
}

export async function createCampaignsFromSelection(input: {
  name?: string | null;
  query?: CrmContactQuery;
  contactIds?: string[] | null;
  templateName?: string | null;
  templateId?: string | null;
  createdByEmail?: string | null;
}): Promise<{
  campaigns: Array<{ campaign: OutreachCampaign; recipients: OutreachCampaignRecipient[] }>;
  skipped: Array<{ email: string | null; reason: string }>;
  needsTemplate: number;
}> {
  if (!input.contactIds?.length && !input.query) {
    return { campaigns: [], skipped: [], needsTemplate: 0 };
  }
  const allRows = await loadCrmContactRows();
  let selected = input.query ? filterCrmContactRows(allRows, input.query) : allRows;
  if (input.contactIds?.length) {
    const ids = new Set(input.contactIds);
    selected = selected.filter((row) => row.contactId && ids.has(row.contactId));
  }
  selected = selected.filter((row) => row.email?.trim() && !row.doNotEmail);
  if (selected.length > CAMPAIGN_MAX_RECIPIENTS) {
    selected = selected.slice(0, CAMPAIGN_MAX_RECIPIENTS);
  }

  const skipped: Array<{ email: string | null; reason: string }> = [];
  const seen = new Set<string>();
  const eligible: FlatCrmRow[] = [];
  for (const row of selected) {
    const key = uniqueKey(row);
    if (!key || seen.has(key)) {
      skipped.push({ email: row.email, reason: "duplicate" });
      continue;
    }
    seen.add(key);
    eligible.push(row);
  }

  const dbTemplates = await listOutreachEmailTemplates();
  const forcedName =
    input.templateName?.trim() ||
    (input.templateId
      ? dbTemplates.find((t) => t.id === input.templateId)?.name
      : null);

  const groups = forcedName
    ? [{ templateName: forcedName, rows: eligible }]
    : groupRowsBySuggestedTemplate(eligible);

  const leftover = forcedName
    ? []
    : eligible.filter((row) => !suggestedProcessForRow(row).canAutoSetup);
  const needsTemplate = leftover.length;

  const campaigns: Array<{
    campaign: OutreachCampaign;
    recipients: OutreachCampaignRecipient[];
  }> = [];

  const stamp = new Date().toISOString().slice(0, 10);
  for (const group of groups) {
    if (!group.rows.length) continue;
    const template = resolveCampaignTemplate(group.templateName, dbTemplates);
    if (!template) {
      for (const row of group.rows) {
        skipped.push({ email: row.email, reason: "missing_template" });
      }
      continue;
    }
    const name =
      input.name?.trim() ||
      `${template.name} · ${group.rows.length} contact${group.rows.length === 1 ? "" : "s"} · ${stamp}`;
    const campaign = await createOutreachCampaign({
      name,
      templateName: template.name,
      templateId: template.id,
      query: (input.query as Record<string, unknown>) || {},
      createdByEmail: input.createdByEmail ?? null,
      status: "awaiting_approval"
    });
    const recipients: OutreachCampaignRecipient[] = [];
    for (const row of group.rows) {
      const recipient = await addDraftRecipient({
        campaignId: campaign.id,
        row,
        template,
        createdByEmail: input.createdByEmail ?? null
      });
      if (recipient) recipients.push(recipient);
      else skipped.push({ email: row.email, reason: "draft_failed" });
    }
    if (recipients.length) campaigns.push({ campaign, recipients });
  }

  for (const row of leftover) {
    skipped.push({ email: row.email, reason: "need_template" });
  }

  return { campaigns, skipped, needsTemplate };
}

async function addDraftRecipient(input: {
  campaignId: string;
  row: FlatCrmRow;
  template: { id: string | null; name: string; subject: string; bodyText: string };
  createdByEmail: string | null;
}): Promise<OutreachCampaignRecipient | null> {
  const target = await getOutreachTarget(input.row.targetId);
  if (!target) return null;
  const email = input.row.email?.trim() || null;
  if (!email) return null;

  const vars = {
    name: input.row.contactName || email,
    contactName: input.row.contactName || email,
    firstName: input.row.firstName || "",
    lastName: input.row.lastName || "",
    organization: target.organization,
    persona: target.persona || "",
    siteUrl: getBaseUrl(),
    yourName: input.createdByEmail || "Reach For The Stars",
    refCode: target.refCode || ""
  };
  const subject = mergeOutreachTemplate(input.template.subject, vars);
  const bodyText = mergeOutreachTemplate(input.template.bodyText, vars);

  if (PROCESSABLE_STATUSES.has(target.status) && (target.persona || target.category || target.entryPath || target.interest)) {
    const nextStatus = target.status === "prospect" ? "process_chosen" : target.status;
    if (nextStatus !== target.status) {
      await updateOutreachTarget(target.id, {
        organization: target.organization,
        status: nextStatus
      });
      await createOutreachActivity({
        targetId: target.id,
        kind: "status_change",
        subject: `Status → ${nextStatus}`,
        bodyPreview: "Campaign setup chose a marketing process from existing fields.",
        meta: { from: target.status, to: nextStatus, reason: "campaign_setup" },
        createdByEmail: input.createdByEmail
      });
    }
  }

  const recipient = await createOutreachCampaignRecipient({
    campaignId: input.campaignId,
    targetId: target.id,
    contactId: input.row.contactId,
    email,
    subject,
    bodyText,
    status: "draft"
  });

  await createOutreachActivity({
    targetId: target.id,
    contactId: input.row.contactId,
    kind: "campaign_draft",
    subject: `Campaign draft: ${input.template.name}`,
    bodyPreview: subject,
    meta: { campaignId: input.campaignId, templateName: input.template.name },
    createdByEmail: input.createdByEmail
  });

  return recipient;
}

export async function refreshCampaignStatus(campaignId: string): Promise<OutreachCampaign | null> {
  const campaign = await getOutreachCampaign(campaignId);
  if (!campaign || campaign.status === "cancelled") return campaign;
  const recipients = await listOutreachCampaignRecipients(campaignId);
  const sendable = recipients.filter((r) => r.status === "draft" || r.status === "approved");
  const approved = recipients.filter((r) => r.status === "approved");
  const sent = recipients.filter((r) => r.status === "sent");
  if (!recipients.length || (!sendable.length && sent.length)) {
    return updateOutreachCampaign(campaignId, { status: "completed" });
  }
  if (!sendable.length) {
    return updateOutreachCampaign(campaignId, { status: "completed" });
  }
  if (approved.length && approved.length === sendable.length) {
    return updateOutreachCampaign(campaignId, { status: "ready_to_send" });
  }
  if (campaign.status === "sending" || campaign.status === "completed") {
    return campaign;
  }
  return updateOutreachCampaign(campaignId, { status: "awaiting_approval" });
}

export async function approveCampaignRecipients(input: {
  campaignId: string;
  recipientId?: string | null;
  createdByEmail?: string | null;
}): Promise<{ campaign: OutreachCampaign | null; updated: number }> {
  const recipients = await listOutreachCampaignRecipients(input.campaignId);
  const ids = input.recipientId
    ? recipients.filter((r) => r.id === input.recipientId)
    : recipients.filter((r) => r.status === "draft");
  let updated = 0;
  for (const row of ids) {
    if (row.status !== "draft") continue;
    await updateOutreachCampaignRecipient(row.id, { status: "approved" });
    updated += 1;
    await createOutreachActivity({
      targetId: row.targetId,
      contactId: row.contactId,
      kind: "campaign_approved",
      subject: "Campaign draft approved",
      bodyPreview: row.subject,
      meta: { campaignId: input.campaignId, recipientId: row.id },
      createdByEmail: input.createdByEmail ?? null
    });
  }
  const campaign = await refreshCampaignStatus(input.campaignId);
  return { campaign, updated };
}

async function skipIfConvertedOrUnsubscribed(
  recipient: OutreachCampaignRecipient
): Promise<OutreachCampaignRecipientStatus | null> {
  const target = await getOutreachTarget(recipient.targetId);
  if (!target) return "error";
  if (target.doNotEmail) return "skipped_unsubscribed";
  const email = recipient.email?.trim();
  if (!email) return "skipped_no_email";
  if (recipient.contactId) {
    const contact = await getOutreachContact(recipient.contactId);
    if (!contact?.email?.trim()) return "skipped_no_email";
  }
  const member = await getUserByEmail(email);
  if (member) return "skipped_converted";
  if (target.status === "declined" || target.status === "converted") {
    return target.status === "converted" ? "skipped_converted" : "skipped_unsubscribed";
  }
  return null;
}

export async function sendCampaignRecipients(input: {
  campaignId: string;
  recipientId?: string | null;
  createdByEmail?: string | null;
}): Promise<{ sent: number; skipped: number; errors: string[] }> {
  const campaign = await getOutreachCampaign(input.campaignId);
  if (!campaign || campaign.status === "cancelled") {
    return { sent: 0, skipped: 0, errors: ["Campaign is not sendable."] };
  }
  const recipients = await listOutreachCampaignRecipients(input.campaignId);
  if (input.recipientId) {
    const one = recipients.find((r) => r.id === input.recipientId);
    if (one?.status === "draft") {
      await updateOutreachCampaignRecipient(one.id, { status: "approved" });
    }
  }
  const latest = await listOutreachCampaignRecipients(input.campaignId);
  const queue = input.recipientId
    ? latest.filter((r) => r.id === input.recipientId)
    : latest.filter((r) => r.status === "approved");
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  await updateOutreachCampaign(input.campaignId, { status: "sending" });

  for (const row of queue) {
    if (row.status === "sent") continue;
    const block = await skipIfConvertedOrUnsubscribed(row);
    if (block) {
      await updateOutreachCampaignRecipient(row.id, {
        status: block,
        skipReason: block
      });
      skipped += 1;
      continue;
    }
    const html = `<pre style="font-family:Georgia,serif;font-size:15px;line-height:1.5;white-space:pre-wrap;">${escapeHtml(
      row.bodyText
    )}</pre>`;
    const result = await sendEmail({
      to: row.email as string,
      subject: row.subject,
      text: row.bodyText,
      html,
      skipStaffBcc: true
    });
    if (!result.ok) {
      await updateOutreachCampaignRecipient(row.id, {
        status: "error",
        skipReason: result.error || "send_failed"
      });
      errors.push(result.error || "send_failed");
      continue;
    }
    const sentAt = new Date().toISOString();
    await updateOutreachCampaignRecipient(row.id, { status: "sent", sentAt, skipReason: null });
    sent += 1;
    await createOutreachActivity({
      targetId: row.targetId,
      contactId: row.contactId,
      kind: "email_sent",
      subject: row.subject,
      bodyPreview: row.bodyText.slice(0, 500),
      meta: {
        to: row.email,
        campaignId: input.campaignId,
        recipientId: row.id,
        templateName: campaign.templateName
      },
      createdByEmail: input.createdByEmail ?? null
    });
    const target = await getOutreachTarget(row.targetId);
    if (
      target &&
      ["prospect", "process_chosen", "draft_ready", "awaiting_approval", "ready_to_send"].includes(
        target.status
      )
    ) {
      await updateOutreachTarget(target.id, {
        organization: target.organization,
        status: "contacted"
      });
    }
  }

  await refreshCampaignStatus(input.campaignId);
  return { sent, skipped, errors: errors.slice(0, 10) };
}

async function finishIfNoSendable(campaignId: string) {
  await refreshCampaignStatus(campaignId);
}

export async function suppressCampaignsForEmail(
  email: string,
  reason: "unsubscribed" | "converted"
): Promise<number> {
  const open = await listOpenCampaignRecipientsByEmail(email);
  const status: OutreachCampaignRecipientStatus =
    reason === "converted" ? "skipped_converted" : "skipped_unsubscribed";
  const touched = new Set<string>();
  for (const row of open) {
    await updateOutreachCampaignRecipient(row.id, { status, skipReason: reason });
    touched.add(row.campaignId);
  }
  for (const campaignId of touched) await finishIfNoSendable(campaignId);
  return open.length;
}

export async function suppressCampaignsForTarget(
  targetId: string,
  reason: "unsubscribed" | "converted"
): Promise<number> {
  const open = await listOpenCampaignRecipientsByTarget(targetId);
  const status: OutreachCampaignRecipientStatus =
    reason === "converted" ? "skipped_converted" : "skipped_unsubscribed";
  const touched = new Set<string>();
  for (const row of open) {
    await updateOutreachCampaignRecipient(row.id, { status, skipReason: reason });
    touched.add(row.campaignId);
  }
  for (const campaignId of touched) await finishIfNoSendable(campaignId);
  return open.length;
}

export async function listCampaignSummaries() {
  const campaigns = await listOutreachCampaigns();
  const out = [];
  for (const campaign of campaigns) {
    const recipients = await listOutreachCampaignRecipients(campaign.id);
    out.push({
      ...campaign,
      counts: {
        total: recipients.length,
        draft: recipients.filter((r) => r.status === "draft").length,
        approved: recipients.filter((r) => r.status === "approved").length,
        sent: recipients.filter((r) => r.status === "sent").length,
        skipped: recipients.filter((r) => r.status.startsWith("skipped_")).length,
        error: recipients.filter((r) => r.status === "error").length
      }
    });
  }
  return out;
}
