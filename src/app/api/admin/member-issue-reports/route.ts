import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { getIssueResolvedEmailContent } from "@/lib/email-templates";
import {
  countMemberIssueReports,
  getMemberIssueReportById,
  getMemberProfileByUserId,
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

  const total = await countMemberIssueReports(statusFilter);
  const reports = await listMemberIssueReportsAdminPaged({
    page,
    pageSize,
    statusFilter
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return NextResponse.json({
    reports,
    total,
    page,
    pageSize,
    totalPages
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

  const becameResolved =
    parsed.data.status === "resolved" && previous.status !== "resolved";
  let resolutionEmailSent: boolean | undefined;

  if (becameResolved) {
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
      resolutionNotes: effectiveResolutionNotes
    });
    const sendResult = await sendEmail({
      to: previous.memberEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
      skipStaffBcc: true
    });
    resolutionEmailSent = sendResult.ok;
    if (!sendResult.ok) {
      console.error("[member-issue-reports PATCH] Resolution email:", sendResult.error);
    }
  }

  return NextResponse.json(
    resolutionEmailSent === undefined
      ? { ok: true }
      : { ok: true, resolutionEmailSent }
  );
}
