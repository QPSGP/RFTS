import { NextResponse } from "next/server";
import { getUserSessionEmail } from "@/lib/user-auth";
import {
  getMemberAudioActivityForListenProgress,
  getMemberProfileByUserId,
  getUserProfile
} from "@/lib/db";
import { buildListenProgressReport } from "@/lib/member-listen-progress";

/** Member listen history: audios started/completed and schedule steps finished. */
export async function GET() {
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const memberProfile = await getMemberProfileByUserId(profile.id);
  const scheduleStepsCompleted =
    typeof memberProfile?.completedScheduleNights === "number"
      ? memberProfile.completedScheduleNights
      : 0;
  const rows = await getMemberAudioActivityForListenProgress(profile.id, 2500);
  const report = buildListenProgressReport(
    rows.map((r) => ({
      action: r.action,
      details: r.details,
      createdAt: r.createdAt
    })),
    scheduleStepsCompleted
  );
  const res = NextResponse.json(report);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}
