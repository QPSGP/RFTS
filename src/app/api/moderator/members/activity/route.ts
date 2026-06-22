import { NextResponse } from "next/server";
import { z } from "zod";
import { requireModeratorAssignedMember } from "@/lib/moderator-member-access";
import {
  getMemberActivityLogForUser,
  getMemberProfileByUserId,
  getUserByEmail
} from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const querySchema = z.object({
  email: z.string().email(),
  limit: z.string().optional()
});

export async function GET(request: Request) {
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
  return NextResponse.json({
    activityLog,
    scheduleProgress: {
      completedScheduleNights: completed,
      scheduleStartedAt: mp?.scheduleStartedAt ?? null,
      currentNight: Math.min(366, Math.max(1, completed + 1))
    },
    serverTime: new Date().toISOString(),
    newestActivityAt: activityLog[0]?.createdAt ?? null,
    rowCount: activityLog.length
  });
}
