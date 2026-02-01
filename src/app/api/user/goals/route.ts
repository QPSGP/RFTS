import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSessionEmail } from "@/lib/user-auth";
import { getUserProfile, setUserGoals } from "@/lib/db";

const schema = z.object({
  goalIds: z.array(z.string()).min(1).max(10)
});

const GOAL_LIMIT = 10;

const getTierChangeWindowDays = (tier: string | null) => {
  if (tier === "platinum") return 0;
  if (tier === "gold") return 30;
  return 90;
};

const computeGoalEditState = (profile: Awaited<ReturnType<typeof getUserProfile>>) => {
  if (!profile) {
    return { canEdit: false, nextAllowedAt: null as string | null };
  }
  if (profile.goalIds.length === 0) {
    return { canEdit: true, nextAllowedAt: null };
  }
  if (profile.subscriptionStatus !== "active") {
    return { canEdit: false, nextAllowedAt: null };
  }
  const windowDays = getTierChangeWindowDays(profile.subscriptionTier);
  if (!windowDays) {
    return { canEdit: true, nextAllowedAt: null };
  }
  const lastUpdated = profile.goalUpdatedAt
    ? new Date(profile.goalUpdatedAt)
    : null;
  if (!lastUpdated) {
    return { canEdit: true, nextAllowedAt: null };
  }
  const nextAllowed = new Date(lastUpdated.getTime());
  nextAllowed.setDate(nextAllowed.getDate() + windowDays);
  const canEdit = Date.now() >= nextAllowed.getTime();
  return { canEdit, nextAllowedAt: canEdit ? null : nextAllowed.toISOString() };
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
    subscriptionStatus: profile.subscriptionStatus
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
  const editState = computeGoalEditState(profile);
  if (!editState.canEdit) {
    return NextResponse.json(
      { error: "Goal changes are not available yet.", nextAllowedAt: editState.nextAllowedAt },
      { status: 403 }
    );
  }
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  await setUserGoals(profile.id, parsed.data.goalIds);
  return NextResponse.json({ ok: true });
}
