import { NextResponse } from "next/server";
import { requireActiveModerator } from "@/lib/moderator-member-access";
import { getMemberSummariesByEmails, listUsersByEmails } from "@/lib/db";

export async function GET() {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }
  const assignedEmails = moderator.assignedUserEmails;
  const summaries = await getMemberSummariesByEmails(assignedEmails);
  const registered = await listUsersByEmails(assignedEmails);
  const byEmail = new Map(registered.map((row) => [row.email.toLowerCase(), row]));

  const members = summaries.map((summary) => {
    const row = byEmail.get(summary.email.toLowerCase());
    if (!row) {
      return {
        email: summary.email,
        registered: false,
        firstName: summary.firstName,
        lastName: summary.lastName,
        subscriptionTier: summary.subscriptionTier,
        subscriptionStatus: summary.subscriptionStatus,
        goalIds: [],
        playsPerNight: 2
      };
    }
    return {
      email: row.email,
      registered: true,
      firstName: row.firstName,
      lastName: row.lastName,
      subscriptionTier: row.subscriptionTier,
      subscriptionStatus: row.subscriptionStatus,
      goalIds: row.goalIds ?? [],
      playsPerNight: row.playsPerNight ?? 2
    };
  });

  return NextResponse.json({ members });
}
