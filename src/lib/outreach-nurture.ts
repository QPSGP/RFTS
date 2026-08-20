/**
 * Enroll CRM targets in a weekly interest-email sequence and send the next step.
 */
import { sql } from "@vercel/postgres";
import {
  createOutreachActivity,
  getOutreachTarget,
  getUserByEmail,
  listOutreachContacts,
  listOutreachEmailTemplates,
  listOutreachTargets,
  updateOutreachTarget,
  type OutreachEmailTemplate
} from "@/lib/db";
import { getBaseUrl, sendEmail } from "@/lib/email";
import {
  MEMBER_CONVERSION_EMAIL_TEMPLATES,
  type ConversionEmailTemplate
} from "@/lib/member-conversion-emails";
import { mergeOutreachTemplate } from "@/lib/marketing-reference";
import {
  extractLeadGoalInterests,
  planInterestSequence,
  type InterestSequenceStep
} from "@/lib/lead-interest-sequence";
import {
  listDueOutreachNurture,
  listOutreachNurture,
  updateOutreachNurture,
  upsertOutreachNurture,
  type OutreachNurtureRecord
} from "@/lib/outreach-nurture-db";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const STOP_TARGET_STATUSES = new Set([
  "paused",
  "declined",
  "converted"
]);

function plusOneWeek(from = new Date()): string {
  return new Date(from.getTime() + WEEK_MS).toISOString();
}

function findCodeTemplate(name: string): ConversionEmailTemplate | undefined {
  const key = name.trim().toLowerCase();
  return MEMBER_CONVERSION_EMAIL_TEMPLATES.find(
    (t) => t.name.trim().toLowerCase() === key
  );
}

function resolveTemplate(
  name: string,
  dbTemplates: OutreachEmailTemplate[]
): { id: string | null; name: string; subject: string; bodyText: string } | null {
  const key = name.trim().toLowerCase();
  const db = dbTemplates.find((t) => t.name.trim().toLowerCase() === key);
  if (db) {
    return {
      id: db.id,
      name: db.name,
      subject: db.subject,
      bodyText: db.bodyText
    };
  }
  const code = findCodeTemplate(name);
  if (!code) return null;
  return {
    id: null,
    name: code.name,
    subject: code.subject,
    bodyText: code.bodyText
  };
}

export function enrollInterestsFromFields(input: {
  payload?: unknown;
  interest?: string | null;
  extraInterests?: string[] | null;
}): InterestSequenceStep[] {
  const extra = (input.extraInterests || []).filter(Boolean);
  const fromLead = extractLeadGoalInterests(input.payload, input.interest);
  return planInterestSequence([...fromLead, ...extra]);
}

async function leadBlocksNurture(targetId: string): Promise<string | null> {
  try {
    const { rows } = await sql<{ status: string }>`
      SELECT status
      FROM marketing_event_leads
      WHERE outreach_target_id = ${targetId}
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    const status = rows[0]?.status;
    if (status === "converted") return "event_lead_converted";
    if (status === "paused") return "event_lead_paused";
    return null;
  } catch {
    return null;
  }
}

export async function enrollOutreachNurture(input: {
  targetId: string;
  interests?: string[] | null;
  payload?: unknown;
  interest?: string | null;
  createdByEmail?: string | null;
  /** When set, first email is due at this ISO time (default: now, picked up by weekly cron). */
  firstSendAt?: string;
}): Promise<{
  ok: boolean;
  nurture: OutreachNurtureRecord | null;
  reason?: string;
}> {
  const target = await getOutreachTarget(input.targetId);
  if (!target) return { ok: false, nurture: null, reason: "target_not_found" };
  if (target.doNotEmail) {
    return { ok: false, nurture: null, reason: "do_not_email" };
  }

  const plan = enrollInterestsFromFields({
    payload: input.payload,
    interest: input.interest ?? target.interest,
    extraInterests: input.interests
  });
  if (!plan.length) {
    return { ok: false, nurture: null, reason: "no_matching_interests" };
  }

  const nurture = await upsertOutreachNurture({
    targetId: target.id,
    plan,
    nextSendAt: input.firstSendAt || new Date().toISOString(),
    status: "active"
  });

  if (!target.interest && plan.length) {
    await updateOutreachTarget(target.id, {
      organization: target.organization,
      interest: plan.map((s) => s.interest).join(", ")
    });
  }

  await createOutreachActivity({
    targetId: target.id,
    kind: "nurture_enrolled",
    subject: `Weekly sequence: ${plan.length} interest email${plan.length === 1 ? "" : "s"}`,
    bodyPreview: plan.map((s) => s.interest).join(", "),
    meta: { plan },
    createdByEmail: input.createdByEmail ?? null
  });

  return { ok: true, nurture };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendNextNurtureEmail(
  nurture: OutreachNurtureRecord,
  options?: { createdByEmail?: string | null }
): Promise<{ ok: boolean; reason?: string; converted?: boolean }> {
  const target = await getOutreachTarget(nurture.targetId);
  if (!target) {
    await updateOutreachNurture(nurture.id, {
      status: "stopped",
      stopReason: "target_missing",
      nextSendAt: null
    });
    return { ok: false, reason: "target_missing" };
  }
  if (target.doNotEmail) {
    await updateOutreachNurture(nurture.id, {
      status: "stopped",
      stopReason: "do_not_email",
      nextSendAt: null
    });
    return { ok: false, reason: "do_not_email" };
  }
  if (STOP_TARGET_STATUSES.has(target.status)) {
    const converted = target.status === "converted";
    await updateOutreachNurture(nurture.id, {
      status: converted ? "converted" : "stopped",
      stopReason: `target_status_${target.status}`,
      nextSendAt: null
    });
    return { ok: false, reason: `target_status_${target.status}`, converted };
  }

  const leadBlock = await leadBlocksNurture(target.id);
  if (leadBlock) {
    await updateOutreachNurture(nurture.id, {
      status: leadBlock === "event_lead_converted" ? "converted" : "stopped",
      stopReason: leadBlock,
      nextSendAt: null
    });
    return {
      ok: false,
      reason: leadBlock,
      converted: leadBlock === "event_lead_converted"
    };
  }

  const contacts = await listOutreachContacts(target.id);
  const contact =
    contacts.find((c) => c.isPrimary && c.email) ||
    contacts.find((c) => c.email);
  const to = contact?.email?.trim();
  if (!to) {
    await updateOutreachNurture(nurture.id, {
      status: "stopped",
      stopReason: "no_email",
      nextSendAt: null
    });
    return { ok: false, reason: "no_email" };
  }

  const member = await getUserByEmail(to);
  if (member) {
    await updateOutreachNurture(nurture.id, {
      status: "converted",
      stopReason: "already_member",
      nextSendAt: null
    });
    return { ok: false, reason: "already_member", converted: true };
  }

  if (nurture.nextIndex >= nurture.plan.length) {
    await updateOutreachNurture(nurture.id, {
      status: "completed",
      stopReason: "interests_exhausted",
      nextSendAt: null
    });
    return { ok: false, reason: "interests_exhausted" };
  }

  const step = nurture.plan[nurture.nextIndex];
  const dbTemplates = await listOutreachEmailTemplates();
  const template = resolveTemplate(step.templateName, dbTemplates);
  if (!template) {
    const nextIndex = nurture.nextIndex + 1;
    const done = nextIndex >= nurture.plan.length;
    await updateOutreachNurture(nurture.id, {
      nextIndex,
      status: done ? "completed" : "active",
      stopReason: done ? "interests_exhausted" : nurture.stopReason,
      nextSendAt: done ? null : plusOneWeek()
    });
    await createOutreachActivity({
      targetId: target.id,
      kind: "nurture_skipped",
      subject: `Missing template: ${step.templateName}`,
      bodyPreview: step.interest,
      meta: { interest: step.interest, templateName: step.templateName },
      createdByEmail: options?.createdByEmail ?? null
    });
    return { ok: false, reason: "missing_template" };
  }

  const vars = {
    name: contact?.name || to,
    contactName: contact?.name || to,
    firstName: contact?.firstName || "",
    lastName: contact?.lastName || "",
    organization: target.organization,
    persona: target.persona || "",
    siteUrl: getBaseUrl(),
    yourName: "Reach For The Stars",
    refCode: target.refCode || ""
  };
  const subject = mergeOutreachTemplate(template.subject, vars);
  const bodyText = mergeOutreachTemplate(template.bodyText, vars);
  const html = `<pre style="font-family:Georgia,serif;font-size:15px;line-height:1.5;white-space:pre-wrap;">${escapeHtml(
    bodyText
  )}</pre>`;

  const result = await sendEmail({
    to,
    subject,
    text: bodyText,
    html,
    skipStaffBcc: true
  });
  if (!result.ok) {
    return { ok: false, reason: result.error || "send_failed" };
  }

  const sentAt = new Date().toISOString();
  const nextIndex = nurture.nextIndex + 1;
  const plan = nurture.plan.map((item, i) =>
    i === nurture.nextIndex ? { ...item, sentAt } : item
  );
  const done = nextIndex >= plan.length;

  await updateOutreachNurture(nurture.id, {
    plan,
    nextIndex,
    lastSentAt: sentAt,
    nextSendAt: done ? null : plusOneWeek(),
    status: done ? "completed" : "active",
    stopReason: done ? "interests_exhausted" : null
  });

  await createOutreachActivity({
    targetId: target.id,
    contactId: contact?.id,
    kind: "nurture_email_sent",
    subject,
    bodyPreview: bodyText.slice(0, 500),
    meta: {
      to,
      interest: step.interest,
      templateName: template.name,
      templateId: template.id,
      stepIndex: nurture.nextIndex
    },
    createdByEmail: options?.createdByEmail ?? "cron:outreach-nurture"
  });

  if (target.status === "prospect") {
    await updateOutreachTarget(target.id, {
      organization: target.organization,
      status: "contacted",
      followUpAt: done ? target.followUpAt : plusOneWeek()
    });
  } else if (!done) {
    await updateOutreachTarget(target.id, {
      organization: target.organization,
      followUpAt: plusOneWeek()
    });
  }

  return { ok: true };
}

export async function runDueOutreachNurture(options?: {
  createdByEmail?: string | null;
}): Promise<{ due: number; sent: number; skipped: number; errors: string[] }> {
  const due = await listDueOutreachNurture();
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const nurture of due) {
    const result = await sendNextNurtureEmail(nurture, options);
    if (result.ok) sent += 1;
    else {
      skipped += 1;
      if (result.reason && result.reason !== "already_member") {
        errors.push(`${nurture.targetId}:${result.reason}`);
      }
    }
  }
  return { due: due.length, sent, skipped, errors: errors.slice(0, 20) };
}

export async function listNurtureWithTargets() {
  const [nurtures, targets] = await Promise.all([
    listOutreachNurture(),
    listOutreachTargets()
  ]);
  const byId = new Map(targets.map((t) => [t.id, t]));
  return nurtures.map((n) => ({
    ...n,
    organization: byId.get(n.targetId)?.organization || "",
    doNotEmail: byId.get(n.targetId)?.doNotEmail ?? false,
    targetStatus: byId.get(n.targetId)?.status || "",
    nextInterest: n.plan[n.nextIndex]?.interest || null,
    nextTemplate: n.plan[n.nextIndex]?.templateName || null,
    remaining: Math.max(0, n.plan.length - n.nextIndex)
  }));
}
