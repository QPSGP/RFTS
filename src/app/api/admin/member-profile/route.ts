import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { getMemberProfileByUserId, getUserByEmail, upsertMemberProfile } from "@/lib/db";

const querySchema = z.object({
  email: z.string().email()
});

const updateSchema = z.object({
  email: z.string().email(),
  profile: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    gender: z.string().optional(),
    yearBorn: z.number().int().min(1900).max(2100).optional(),
    contactNumber: z.string().optional(),
    bestContactTimes: z.string().optional(),
    timeZone: z.string().optional(),
    occupation: z.string().optional(),
    incomeGoal: z.string().optional(),
    incomeGoalYear: z.number().int().min(1900).max(2100).optional(),
    incomeGoalRelation: z.string().optional(),
    isFirstResponder: z.boolean().optional(),
    wantsPracticeGrowth: z.boolean().optional(),
    adultConsent: z.boolean().optional(),
    wantsPolyamory: z.boolean().optional(),
    hadLgdSession: z.boolean().optional(),
    referralSource: z.string().optional()
  })
});

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ email: url.searchParams.get("email") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const user = await getUserByEmail(parsed.data.email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const profile = await getMemberProfileByUserId(user.id);
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const user = await getUserByEmail(parsed.data.email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const existing = await getMemberProfileByUserId(user.id);
  const yearBorn = parsed.data.profile.yearBorn ?? existing?.yearBorn ?? null;
  const currentYear = new Date().getFullYear();
  const isAgeVerified = yearBorn != null && currentYear - yearBorn >= 18;
  const rawAdultConsent = parsed.data.profile.adultConsent ?? existing?.adultConsent ?? false;
  const adultConsent = rawAdultConsent && isAgeVerified;

  await upsertMemberProfile({
    userId: user.id,
    firstName: parsed.data.profile.firstName ?? existing?.firstName ?? null,
    lastName: parsed.data.profile.lastName ?? existing?.lastName ?? null,
    gender: parsed.data.profile.gender ?? existing?.gender ?? null,
    yearBorn,
    contactNumber: parsed.data.profile.contactNumber ?? existing?.contactNumber ?? null,
    bestContactTimes:
      parsed.data.profile.bestContactTimes ?? existing?.bestContactTimes ?? null,
    timeZone: parsed.data.profile.timeZone ?? existing?.timeZone ?? null,
    occupation: parsed.data.profile.occupation ?? existing?.occupation ?? null,
    incomeGoal: parsed.data.profile.incomeGoal ?? existing?.incomeGoal ?? null,
    incomeGoalYear:
      parsed.data.profile.incomeGoalYear ?? existing?.incomeGoalYear ?? null,
    incomeGoalRelation:
      parsed.data.profile.incomeGoalRelation ?? existing?.incomeGoalRelation ?? null,
    isFirstResponder:
      parsed.data.profile.isFirstResponder ?? existing?.isFirstResponder ?? false,
    wantsPracticeGrowth:
      parsed.data.profile.wantsPracticeGrowth ?? existing?.wantsPracticeGrowth ?? false,
    adultConsent,
    wantsPolyamory:
      parsed.data.profile.wantsPolyamory ?? existing?.wantsPolyamory ?? false,
    hadLgdSession:
      parsed.data.profile.hadLgdSession ?? existing?.hadLgdSession ?? false,
    referralSource:
      parsed.data.profile.referralSource ?? existing?.referralSource ?? null
  });
  return NextResponse.json({ ok: true });
}
