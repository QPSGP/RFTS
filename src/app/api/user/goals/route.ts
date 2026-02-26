import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSessionEmail } from "@/lib/user-auth";
import { getUserProfile, recordMemberActivity, setScheduleStartedToToday, setUserGoals, setUserPlaysPerNight } from "@/lib/db";

const schema = z.object({
  goalIds: z.array(z.string()).min(1).max(10).optional(),
  playsPerNight: z.number().int().min(1).max(2).optional()
});

const GOAL_LIMIT = 10;

const computeGoalEditState = (profile: Awaited<ReturnType<typeof getUserProfile>>) => {
  if (!profile) {
    return { canEdit: false, nextAllowedAt: null as string | null };
  }
  if (profile.subscriptionStatus !== "active") {
    return { canEdit: false, nextAllowedAt: null };
  }
  return { canEdit: true, nextAllowedAt: null };
};

export async function GET() {
  const email = getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const editState = computeGoalEditState(profile);
  return NextResponse.json({
    goalIds: profile.goalIds || [],
    limit: GOAL_LIMIT,
    canEdit: editState.canEdit,
    nextAllowedAt: editState.nextAllowedAt,
    subscriptionTier: profile.subscriptionTier,
    subscriptionStatus: profile.subscriptionStatus,
    playsPerNight: profile.playsPerNight || 2
  });
}

export async function PUT(request: Request) {
  const email = getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const editState = computeGoalEditState(profile);
  const nextGoals = parsed.data.goalIds;
  if (nextGoals) {
    if (!editState.canEdit) {
      return NextResponse.json(
        { error: "You must have an active subscription to update goals." },
        { status: 403 }
      );
    }
    await setUserGoals(profile.id, nextGoals);
    await recordMemberActivity(profile.id, "updated_goals");
    await setScheduleStartedToToday(profile.id);
  }
  if (typeof parsed.data.playsPerNight === "number") {
    await setUserPlaysPerNight(profile.id, parsed.data.playsPerNight);
    await recordMemberActivity(profile.id, "updated_plays_per_night");
    await setScheduleStartedToToday(profile.id);
  }
  return NextResponse.json({ ok: true });
}
