import { NextResponse } from "next/server";
import { z } from "zod";
import { requireModeratorAssignedMember } from "@/lib/moderator-member-access";
import { recordModeratorStaffActivity } from "@/lib/facilitator-staff-activity";
import { getMemberProfileByUserId, getUserByEmail, getUserProfile, upsertMemberProfile } from "@/lib/db";

const querySchema = z.object({
  email: z.string().email()
});

const updateSchema = z.object({
  email: z.string().email(),
  notes: z.string().nullable().optional()
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ email: url.searchParams.get("email") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  const access = await requireModeratorAssignedMember(parsed.data.email);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const user = await getUserByEmail(access.memberEmail);
  if (!user) {
    return NextResponse.json({
      member: {
        email: access.memberEmail,
        registered: false
      }
    });
  }
  const profile = await getUserProfile(access.memberEmail);
  const memberProfile = await getMemberProfileByUserId(user.id);
  return NextResponse.json({
    member: {
      email: user.email,
      registered: true,
      subscriptionTier: profile?.subscriptionTier ?? null,
      subscriptionStatus: profile?.subscriptionStatus ?? null,
      goalIds: profile?.goalIds ?? [],
      playsPerNight: profile?.playsPerNight ?? 2,
      profile: memberProfile
    }
  });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const access = await requireModeratorAssignedMember(parsed.data.email);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const user = await getUserByEmail(access.memberEmail);
  if (!user) {
    return NextResponse.json({ error: "Member has not registered yet." }, { status: 404 });
  }

  const existing = await getMemberProfileByUserId(user.id);
  const nextNotes =
    parsed.data.notes !== undefined ? parsed.data.notes : existing?.notes ?? null;

  await upsertMemberProfile({
    userId: user.id,
    firstName: existing?.firstName ?? null,
    lastName: existing?.lastName ?? null,
    gender: existing?.gender ?? null,
    yearBorn: existing?.yearBorn ?? null,
    birthDate: existing?.birthDate ?? undefined,
    contactNumber: existing?.contactNumber ?? null,
    bestContactTimes: existing?.bestContactTimes ?? null,
    timeZone: existing?.timeZone ?? null,
    occupation: existing?.occupation ?? null,
    incomeGoal: existing?.incomeGoal ?? null,
    incomeGoalYear: existing?.incomeGoalYear ?? null,
    incomeGoalRelation: existing?.incomeGoalRelation ?? null,
    isFirstResponder: existing?.isFirstResponder ?? false,
    wantsPracticeGrowth: existing?.wantsPracticeGrowth ?? false,
    adultConsent: existing?.adultConsent ?? false,
    wantsPolyamory: existing?.wantsPolyamory ?? false,
    hadLgdSession: existing?.hadLgdSession ?? false,
    referralSource: existing?.referralSource ?? null,
    notes: nextNotes
  });

  await recordModeratorStaffActivity(`updated_member_notes:${access.memberEmail}`);

  return NextResponse.json({ ok: true, notes: nextNotes });
}
