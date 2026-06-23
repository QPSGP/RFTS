import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveModerator, requireModeratorAssignedMember } from "@/lib/moderator-member-access";
import {
  getMemberActivityLogForUser,
  getMemberProfileByUserId,
  getUserByEmail,
  getUserProfile
} from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const querySchema = z.object({
  email: z.string().email(),
  limit: z.string().optional()
});

export async function GET(request: Request) {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    email: url.searchParams.get("email"),
    limit: url.searchParams.get("limit")
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  const access = await requireModeratorAssignedMember(parsed.data.email);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const user = await getUserByEmail(access.memberEmail);
  if (!user) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  let perUserLimit = 100;
  if (parsed.data.limit) {
    const n = parseInt(parsed.data.limit, 10);
    if (Number.isFinite(n)) {
      perUserLimit = Math.min(200, Math.max(20, n));
    }
  }
  const activityLog = await getMemberActivityLogForUser(user.id, perUserLimit);
  const mp = await getMemberProfileByUserId(user.id);
  const completed = Math.max(0, Math.min(366, mp?.completedScheduleNights ?? 0));
  const profile = await getUserProfile(access.memberEmail);
  const lastLogin = activityLog.find((row) => row.action === "login");
  const lastPlay = activityLog.find(
    (row) => row.action === "played_audio" || row.action === "audio_playback_outcome"
  );
  return NextResponse.json({
    activityLog,
    scheduleProgress: {
      completedScheduleNights: completed,
      scheduleStartedAt: mp?.scheduleStartedAt ?? null,
      currentNight: Math.min(366, Math.max(1, completed + 1))
    },
    summary: {
      goalCount: profile?.goalIds?.length ?? 0,
      lastLoginAt: lastLogin?.createdAt ?? null,
      lastPlayAt: lastPlay?.createdAt ?? null,
      lastPlayDetails: lastPlay?.details ?? null,
      activityRowCount: activityLog.length
    },
    serverTime: new Date().toISOString(),
    newestActivityAt: activityLog[0]?.createdAt ?? null,
    rowCount: activityLog.length
  });
}
