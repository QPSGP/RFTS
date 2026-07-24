import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSessionEmail } from "@/lib/user-auth";
import { getUserProfile, recordScheduleNightCompleted } from "@/lib/db";
import { SCHEDULE_MAX_NIGHTS } from "@/lib/schedule-limits";

const bodySchema = z.object({
  nightCompleted: z.number().int().min(1).max(SCHEDULE_MAX_NIGHTS)
});

export async function POST(request: Request) {
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (profile.subscriptionStatus !== "active") {
    return NextResponse.json({ error: "Subscription required." }, { status: 403 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const playsPerNight = profile.playsPerNight === 1 ? 1 : 2;
  const result = await recordScheduleNightCompleted(
    profile.id,
    parsed.data.nightCompleted,
    playsPerNight
  );
  if (!result.ok) {
    const status = result.error === "Member profile not found." ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({
    ok: true,
    completedScheduleNights: result.completedScheduleNights
  });
}
