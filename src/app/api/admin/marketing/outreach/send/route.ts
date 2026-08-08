import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import {
  createOutreachActivity,
  getOutreachContact,
  getOutreachTarget,
  listOutreachEmailTemplates,
  updateOutreachTarget
} from "@/lib/db";
import { sendEmail, getBaseUrl } from "@/lib/email";
import { mergeOutreachTemplate } from "@/lib/marketing-reference";

const sendSchema = z.object({
  targetId: z.string().uuid(),
  contactId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  subject: z.string().trim().min(1).max(300),
  bodyText: z.string().trim().min(1).max(20000),
  /** When true, set status to contacted if still prospect. */
  markContacted: z.boolean().optional().default(true),
  /** Optional follow-up date (ISO or YYYY-MM-DD). */
  followUpAt: z.string().trim().max(40).nullish()
});

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const target = await getOutreachTarget(parsed.data.targetId);
  if (!target) {
    return NextResponse.json({ error: "Target not found." }, { status: 404 });
  }
  if (target.doNotEmail) {
    return NextResponse.json(
      { error: "This target is marked do-not-email." },
      { status: 400 }
    );
  }

  const contact = await getOutreachContact(parsed.data.contactId);
  if (!contact || contact.targetId !== target.id) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }
  const to = contact.email?.trim();
  if (!to) {
    return NextResponse.json({ error: "Contact has no email address." }, { status: 400 });
  }

  let subject = parsed.data.subject;
  let bodyText = parsed.data.bodyText;
  let templateName: string | null = null;

  if (parsed.data.templateId) {
    const templates = await listOutreachEmailTemplates();
    const template = templates.find((t) => t.id === parsed.data.templateId);
    if (template) {
      templateName = template.name;
    }
  }

  const vars = {
    name: contact.name || to,
    contactName: contact.name || to,
    firstName: contact.firstName || "",
    lastName: contact.lastName || "",
    organization: target.organization,
    persona: target.persona || "",
    siteUrl: getBaseUrl(),
    yourName: getSessionEmail() || "Reach For The Stars",
    refCode: target.refCode || ""
  };
  subject = mergeOutreachTemplate(subject, vars);
  bodyText = mergeOutreachTemplate(bodyText, vars);

  const html = `<pre style="font-family:Georgia,serif;font-size:15px;line-height:1.5;white-space:pre-wrap;">${escapeHtml(
    bodyText
  )}</pre>`;

  const result = await sendEmail({
    to,
    subject,
    text: bodyText,
    html
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || "Send failed." },
      { status: 503 }
    );
  }

  const by = getSessionEmail();
  await createOutreachActivity({
    targetId: target.id,
    contactId: contact.id,
    kind: "email_sent",
    subject,
    bodyPreview: bodyText.slice(0, 500),
    meta: {
      to,
      templateId: parsed.data.templateId ?? null,
      templateName
    },
    createdByEmail: by
  });

  let followUpAt: string | null | undefined = undefined;
  if (parsed.data.followUpAt) {
    const ms = Date.parse(parsed.data.followUpAt);
    followUpAt = Number.isNaN(ms) ? null : new Date(ms).toISOString();
  }

  const nextStatus =
    parsed.data.markContacted &&
    ["prospect", "process_chosen", "draft_ready", "awaiting_approval", "ready_to_send"].includes(
      target.status
    )
      ? "contacted"
      : target.status;

  const updated = await updateOutreachTarget(target.id, {
    organization: target.organization,
    category: target.category,
    persona: target.persona,
    entryPath: target.entryPath,
    contact: target.contact,
    refCode: target.refCode,
    status: nextStatus,
    notes: target.notes,
    interest: target.interest,
    audienceSize: target.audienceSize,
    decisionTimeline: target.decisionTimeline,
    followUpAt: followUpAt !== undefined ? followUpAt : target.followUpAt,
    doNotEmail: target.doNotEmail
  });

  if (nextStatus !== target.status) {
    await createOutreachActivity({
      targetId: target.id,
      kind: "status_change",
      subject: `Status → ${nextStatus}`,
      bodyPreview: `${target.status} → ${nextStatus}`,
      meta: { from: target.status, to: nextStatus, reason: "email_sent" },
      createdByEmail: by
    });
  }

  return NextResponse.json({ ok: true, target: updated });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
