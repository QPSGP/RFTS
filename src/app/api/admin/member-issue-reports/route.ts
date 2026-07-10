import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import { getIssueResolvedStaffMonitorBcc, sendEmail } from "@/lib/email";
import { getIssueResolvedEmailContent } from "@/lib/email-templates";
import { rateLimit } from "@/lib/rate-limit";
import {
  appendAdminReportIssueContext,
  formatAdminReportIssueContextBlock,
  type ClientDiagnosticContext
} from "@/lib/report-issue-context";
import { mergeReportIssueAttachmentUrls } from "@/lib/report-issue-attachments";
import {
  countMemberIssueReports,
  getMemberIssueReportById,
  getMemberProfileByUserId,
  insertMemberIssueReport,
  isAdminFiledIssueReport,
  listMemberIssueReportsAdminPaged,
  updateMemberIssueReportAdmin,
  type MemberIssueReportStatus
} from "@/lib/db";

const statusSchema = z.enum(["open", "in_progress", "resolved", "closed"]);

const patchSchema = z.object({
  id: z.string().uuid(),
  status: statusSchema,
  /** Send null to clear; omit property to leave existing notes unchanged. */
  resolutionNotes: z.string().max(5000).nullable().optional()
});

const statusFilterSchema = z.enum(["all", "open", "in_progress", "resolved", "closed"]);

const clientContextSchema = z
  .object({
    pageUrl: z.string().max(2048).optional(),
    userAgent: z.string().max(2000).optional(),
    platform: z.string().max(200).optional(),
    language: z.string().max(50).optional(),
    timeZone: z.string().max(100).optional(),
    screen: z.string().max(100).optional(),
    viewport: z.string().max(100).optional(),
    deviceMemoryGb: z.number().nullable().optional(),
    hardwareConcurrency: z.number().nullable().optional(),
    touchPoints: z.number().optional(),
    standalonePwa: z.boolean().optional(),
    collectedAt: z.string().max(50).optional()
  })
  .optional();

const postSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  category: z.string().max(100).optional().default(""),
  attachmentUrls: z.array(z.string().url().max(2048)).max(3).optional(),
  screenshotUrl: z.string().url().max(2048).optional(),
  clientContext: clientContextSchema
});

const REPORT_ISSUE_MAX_PER_MINUTE = 10;

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const pageRaw = url.searchParams.get("page");
  const pageSizeRaw = url.searchParams.get("pageSize");
  const statusParam = url.searchParams.get("status")?.trim() || "all";
  const statusParsed = statusFilterSchema.safeParse(statusParam);
  const statusFilter = (statusParsed.success ? statusParsed.data : "all") as
    | "all"
    | MemberIssueReportStatus;

  const page = Math.max(1, Math.floor(Number(pageRaw) || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSizeRaw) || 25)));

  const { count: total, queryFailed: countFailed } = await countMemberIssueReports(statusFilter);
  const { reports, queryFailed: listFailed } = await listMemberIssueReportsAdminPaged({
    page,
    pageSize,
    statusFilter
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const queryFailed = countFailed || listFailed;

  return NextResponse.json({
    reports,
    total,
    page,
    pageSize,
    totalPages,
    ...(queryFailed
      ? {
          dbWarning:
            "Could not read the issue reports table. Run scripts/migrate-member-issue-reports.sql, scripts/migrate-member-issue-screenshot.sql, and scripts/migrate-member-issue-attachments.sql on production Postgres."
        }
      : {})
  });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const adminEmail = getSessionEmail();
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!rateLimit(`admin-report-issue:${adminEmail}`, REPORT_ISSUE_MAX_PER_MINUTE)) {
    return NextResponse.json({ error: "Too many reports. Please try again in a minute." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input. Please provide a subject and message." }, { status: 400 });
  }

  const to = process.env.REPORT_ISSUE_EMAIL || "Richard@richardleeweatherman.com";
  const categoryLabel = parsed.data.category?.trim()
    ? `Internal · ${parsed.data.category.trim()}`
    : "Internal";
  const attachmentUrls = mergeReportIssueAttachmentUrls(
    parsed.data.attachmentUrls,
    parsed.data.screenshotUrl
  );
  const screenshotUrl = attachmentUrls[0] ?? null;
  const clientContext = parsed.data.clientContext as ClientDiagnosticContext | undefined;
  const messageWithContext = appendAdminReportIssueContext(
    parsed.data.message,
    adminEmail,
    clientContext
  );
  const contextBlock = formatAdminReportIssueContextBlock(adminEmail, clientContext);
  const subject = `[RFTS Admin Report] ${parsed.data.subject}`;
  const attachmentHtml = attachmentUrls.length
    ? `<p><strong>Attachments:</strong></p><ul>${attachmentUrls
        .map((url, index) => `<li><a href="${url}">Attachment ${index + 1}</a></li>`)
        .join("")}</ul>`
    : "";
  const attachmentText = attachmentUrls.length
    ? `\nAttachments:\n${attachmentUrls.map((url, index) => `${index + 1}. ${url}`).join("\n")}`
    : "";
  const html = `
    <p><strong>Internal report from admin:</strong> ${adminEmail}</p>
    <p><strong>Category:</strong> ${categoryLabel}</p>
    <p><strong>Subject:</strong> ${parsed.data.subject}</p>
    ${attachmentHtml}
    <hr />
    <p>${parsed.data.message.replace(/\n/g, "<br />")}</p>
    <hr />
    <pre style="font-size:12px;white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:8px;">${contextBlock.replace(/</g, "&lt;")}</pre>
    <p style="font-size:13px;color:#64748b;">Also queued at /admin/member-issues for other admins to resolve.</p>
  `;
  const text = `Internal report from admin: ${adminEmail}\nCategory: ${categoryLabel}\nSubject: ${parsed.data.subject}${attachmentText}\n\n${parsed.data.message}\n\n${contextBlock}\n\nAlso queued at /admin/member-issues.`;

  const { ok, error } = await sendEmail({ to, subject, html, text });
  if (!ok) {
    const isNotConfigured = error?.includes("RESEND_API_KEY");
    return NextResponse.json(
      {
        error: isNotConfigured
          ? "Email is not configured. Could not notify the team."
          : error || "Could not send report email."
      },
      { status: isNotConfigured ? 503 : 500 }
    );
  }

  const storedInAdmin = await insertMemberIssueReport({
    userId: null,
    memberEmail: adminEmail,
    category: categoryLabel,
    subject: parsed.data.subject,
    message: messageWithContext,
    screenshotUrl,
    attachmentUrls
  });
  if (!storedInAdmin) {
    console.error(
      "[admin member-issue-reports POST] Email sent but member_issue_reports insert failed"
    );
  }

  return NextResponse.json({
    message: storedInAdmin
      ? "Report filed. Other admins can resolve it from this queue."
      : "Email sent to the team, but the admin queue could not be updated. Check database migrations.",
    storedInAdmin
  });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const adminEmail = getSessionEmail();
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const previous = await getMemberIssueReportById(parsed.data.id);
  if (!previous) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const notesPayload =
    parsed.data.resolutionNotes === undefined
      ? undefined
      : parsed.data.resolutionNotes === null
        ? null
        : String(parsed.data.resolutionNotes).trim() || null;

  const effectiveResolutionNotes =
    notesPayload !== undefined ? notesPayload : previous.resolutionNotes;

  const result = await updateMemberIssueReportAdmin(parsed.data.id, {
    status: parsed.data.status as MemberIssueReportStatus,
    resolutionNotes: notesPayload,
    resolvedByEmail: adminEmail
  });
  if (!result.ok) {
    const status = result.error === "Report not found." ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  const wasTerminal = previous.status === "resolved" || previous.status === "closed";
  const isTerminal = parsed.data.status === "resolved" || parsed.data.status === "closed";
  /** First time moving to resolved or closed — email member once (not for admin-filed internal tickets). */
  const shouldNotifyMember =
    isTerminal && !wasTerminal && !isAdminFiledIssueReport(previous);
  let resolutionEmailSent: boolean | undefined;

  if (shouldNotifyMember && previous.userId) {
    let firstName: string | null = null;
    try {
      const profile = await getMemberProfileByUserId(previous.userId);
      firstName = profile?.firstName ?? null;
    } catch {
      // non-fatal
    }
    const content = getIssueResolvedEmailContent({
      firstName,
      reportSubject: previous.subject,
      categoryLabel: previous.category || "General",
      resolutionNotes: effectiveResolutionNotes,
      outcome: parsed.data.status === "closed" ? "closed" : "resolved"
    });
    const monitorBcc = getIssueResolvedStaffMonitorBcc(previous.memberEmail);
    const sendResult = await sendEmail({
      to: previous.memberEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
      skipStaffBcc: true,
      ...(monitorBcc.length ? { bcc: monitorBcc } : {})
    });
    resolutionEmailSent = sendResult.ok;
    if (!sendResult.ok) {
      console.error("[member-issue-reports PATCH] Member status email:", sendResult.error);
    }
  }

  return NextResponse.json(
    resolutionEmailSent === undefined
      ? { ok: true, adminFiled: isAdminFiledIssueReport(previous) }
      : { ok: true, resolutionEmailSent, adminFiled: false }
  );
}
