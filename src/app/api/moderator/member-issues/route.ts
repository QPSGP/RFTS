import { NextResponse } from "next/server";
import { listMemberIssueReportsForMemberEmails } from "@/lib/db";
import { requireActiveModerator } from "@/lib/moderator-member-access";

export async function GET() {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }

  const reports = await listMemberIssueReportsForMemberEmails(
    moderator.assignedUserEmails,
    80
  );

  return NextResponse.json({ reports });
}
