import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import {
  listMemberIssueReportsForAdmin,
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

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const reports = await listMemberIssueReportsForAdmin(200);
  return NextResponse.json({ reports });
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
  const notesPayload =
    parsed.data.resolutionNotes === undefined
      ? undefined
      : parsed.data.resolutionNotes === null
        ? null
        : String(parsed.data.resolutionNotes).trim() || null;

  const result = await updateMemberIssueReportAdmin(parsed.data.id, {
    status: parsed.data.status as MemberIssueReportStatus,
    resolutionNotes: notesPayload,
    resolvedByEmail: adminEmail
  });
  if (!result.ok) {
    const status = result.error === "Report not found." ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
