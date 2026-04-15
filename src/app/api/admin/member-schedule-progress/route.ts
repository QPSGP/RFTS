import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { adminSetMemberCompletedScheduleNights, getUserByEmail, recordMemberActivity } from "@/lib/db";

const bodySchema = z.object({
  email: z.string().email(),
  completedScheduleNights: z.number().int().min(0).max(366)
});

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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
  const user = await getUserByEmail(parsed.data.email.trim());
  if (!user) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  const result = await adminSetMemberCompletedScheduleNights(user.id, parsed.data.completedScheduleNights);
  if (!result.ok) {
    const status = result.error === "Member profile not found." ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  await recordMemberActivity(
    user.id,
    "admin_schedule_adjusted",
    `Completed listening nights set to ${result.completedScheduleNights} (admin)`
  );
  return NextResponse.json({
    ok: true,
    completedScheduleNights: result.completedScheduleNights,
    currentNight: Math.min(366, Math.max(1, result.completedScheduleNights + 1))
  });
}
