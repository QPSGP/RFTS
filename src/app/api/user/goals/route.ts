import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSessionEmail } from "@/lib/user-auth";
import {
  adminSetMemberCompletedScheduleNights,
  getMemberProfileByUserId,
  getUserProfile,
  recordMemberActivity,
  setScheduleStartedToToday,
  setUserGoals,
  setUserPlaysPerNight
} from "@/lib/db";
import { goalIdsSequenceEqual } from "@/lib/goal-ids";
import { convertCompletedNightsForPlaysPerNightChange } from "@/lib/schedule-progress";

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
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  
  // Managed = Platinum Managed tier only (Platinum = goal-based, can see and edit goals)
  const isManaged = profile.subscriptionTier === "platinum_managed";

  const editState = computeGoalEditState(profile);
  return NextResponse.json({
    goalIds: profile.goalIds || [],
    limit: GOAL_LIMIT,
    canEdit: isManaged ? false : editState.canEdit, // Managed members cannot edit goals
    nextAllowedAt: editState.nextAllowedAt,
    subscriptionTier: profile.subscriptionTier,
    subscriptionStatus: profile.subscriptionStatus,
    playsPerNight: profile.playsPerNight || 2,
    isManaged // Flag to indicate this is a managed member
  });
}

export async function PUT(request: Request) {
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  
  // Managed = Platinum Managed tier only
  const isManaged = profile.subscriptionTier === "platinum_managed";

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const editState = computeGoalEditState(profile);
  const nextGoals = parsed.data.goalIds;
  if (nextGoals) {
    if (isManaged) {
      return NextResponse.json(
        { error: "Managed members cannot update goals. Your content is managed by an administrator." },
        { status: 403 }
      );
    }
    if (!editState.canEdit) {
      return NextResponse.json(
        { error: "You must have an active subscription to update goals." },
        { status: 403 }
      );
    }
    const currentGoals = profile.goalIds || [];
    if (!goalIdsSequenceEqual(currentGoals, nextGoals)) {
      await setUserGoals(profile.id, nextGoals);
      await recordMemberActivity(profile.id, "updated_goals");
      await setScheduleStartedToToday(profile.id);
    }
  }
  if (typeof parsed.data.playsPerNight === "number") {
    const nextPpn = parsed.data.playsPerNight === 1 ? 1 : 2;
    const currentPpn = profile.playsPerNight === 1 ? 1 : 2;
    if (nextPpn !== currentPpn) {
      const memberProfile = await getMemberProfileByUserId(profile.id);
      const completed = Math.max(0, memberProfile?.completedScheduleNights ?? 0);
      const converted = convertCompletedNightsForPlaysPerNightChange(
        completed,
        currentPpn,
        nextPpn
      );
      await setUserPlaysPerNight(profile.id, nextPpn);
      await adminSetMemberCompletedScheduleNights(profile.id, converted);
      await recordMemberActivity(profile.id, "updated_plays_per_night");
    }
  }
  return NextResponse.json({ ok: true });
}
