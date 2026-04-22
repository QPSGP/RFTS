import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import {
  getMemberActivityLog,
  getMemberActivityLogForUser,
  getMemberProfileByUserId,
  getUserByEmail
} from "@/lib/db";

/** Never cache: admin must see rows as soon as they are written. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreJson = (body: Record<string, unknown>, init?: { status?: number }) =>
  NextResponse.json(body, {
    status: init?.status,
    headers: {
      "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
      Vary: "Cookie"
    }
  });

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return noStoreJson({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim();
  const limitRaw = url.searchParams.get("limit");
  let perUserLimit = 300;
  if (limitRaw) {
    const n = parseInt(limitRaw, 10);
    if (Number.isFinite(n)) {
      perUserLimit = Math.min(500, Math.max(20, n));
    }
  }
  if (email) {
    const user = await getUserByEmail(email);
    if (!user) {
      return noStoreJson({ error: "Member not found." }, { status: 404 });
    }
    const activityLog = await getMemberActivityLogForUser(user.id, perUserLimit);
    const mp = await getMemberProfileByUserId(user.id);
    const completed = Math.max(0, Math.min(366, mp?.completedScheduleNights ?? 0));
    const scheduleProgress = {
      completedScheduleNights: completed,
      scheduleStartedAt: mp?.scheduleStartedAt ?? null,
      currentNight: Math.min(366, Math.max(1, completed + 1))
    };
    return noStoreJson({ activityLog, scheduleProgress });
  }
  const activityLog = await getMemberActivityLog(100);
  return noStoreJson({ activityLog });
}
