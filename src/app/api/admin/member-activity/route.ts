import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import {
  getMemberActivityLog,
  getMemberActivityLogForUser,
  getMemberProfileByUserId,
  getUserByEmail
} from "@/lib/db";

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const email = new URL(request.url).searchParams.get("email")?.trim();
  if (email) {
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }
    const activityLog = await getMemberActivityLogForUser(user.id, 150);
    const mp = await getMemberProfileByUserId(user.id);
    const completed = Math.max(0, Math.min(366, mp?.completedScheduleNights ?? 0));
    const scheduleProgress = {
      completedScheduleNights: completed,
      scheduleStartedAt: mp?.scheduleStartedAt ?? null,
      currentNight: Math.min(366, Math.max(1, completed + 1))
    };
    return NextResponse.json({ activityLog, scheduleProgress });
  }
  const activityLog = await getMemberActivityLog(100);
  return NextResponse.json({ activityLog });
}
