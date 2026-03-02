import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSessionEmail } from "@/lib/user-auth";
import {
  getMemberProfileByUserId,
  getUserProfile,
  upsertMemberProfile
} from "@/lib/db";

const yearSchema = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = typeof v === "string" ? parseInt(v, 10) : v;
    if (Number.isNaN(n) || n < 1900 || n > 2100) return undefined;
    return n;
  });

const updateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  gender: z.string().optional(),
  yearBorn: yearSchema,
  contactNumber: z.string().optional(),
  bestContactTimes: z.string().optional(),
  timeZone: z.string().optional(),
  occupation: z.string().optional(),
  wantsPracticeGrowth: z.boolean().optional(),
  adultConsent: z.boolean().optional(),
  wantsPolyamory: z.boolean().optional(),
  hadLgdSession: z.boolean().optional(),
  referralSource: z.string().optional()
});

export async function GET() {
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const user = await getUserProfile(email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const memberProfile = await getMemberProfileByUserId(user.id);
  if (!memberProfile) {
    return NextResponse.json({
      profile: {
        email: user.email,
        firstName: null,
        lastName: null,
        gender: null,
        yearBorn: null,
        contactNumber: null,
        bestContactTimes: null,
        timeZone: "Pacific Time",
        occupation: null,
        wantsPracticeGrowth: false,
        adultConsent: false,
        wantsPolyamory: false,
        hadLgdSession: false,
        referralSource: null
      }
    });
  }
  const yearBornRaw = memberProfile.yearBorn ?? null;
  const yearBorn =
    yearBornRaw != null
      ? typeof yearBornRaw === "number"
        ? yearBornRaw
        : parseInt(String(yearBornRaw), 10)
      : null;
  const yearBornNum =
    yearBorn != null && !Number.isNaN(yearBorn) && yearBorn >= 1900 && yearBorn <= 2100
      ? yearBorn
      : null;
  return NextResponse.json({
    profile: {
      email: user.email,
      firstName: memberProfile.firstName ?? null,
      lastName: memberProfile.lastName ?? null,
      gender: memberProfile.gender ?? null,
      yearBorn: yearBornNum,
      contactNumber: memberProfile.contactNumber ?? null,
      bestContactTimes: memberProfile.bestContactTimes ?? null,
      timeZone: memberProfile.timeZone ?? "Pacific Time",
      occupation: memberProfile.occupation ?? null,
      wantsPracticeGrowth: memberProfile.wantsPracticeGrowth ?? false,
      adultConsent: memberProfile.adultConsent ?? false,
      wantsPolyamory: memberProfile.wantsPolyamory ?? false,
      hadLgdSession: memberProfile.hadLgdSession ?? false,
      referralSource: memberProfile.referralSource ?? null
    }
  });
}

export async function PATCH(request: Request) {
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const user = await getUserProfile(email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const existing = await getMemberProfileByUserId(user.id);
  const yearBorn = parsed.data.yearBorn ?? existing?.yearBorn ?? null;
  const currentYear = new Date().getFullYear();
  const isAgeVerified = yearBorn != null && currentYear - yearBorn >= 18;
  const rawAdultConsent = parsed.data.adultConsent ?? existing?.adultConsent ?? false;
  const adultConsent = rawAdultConsent && isAgeVerified;

  await upsertMemberProfile({
    userId: user.id,
    firstName: parsed.data.firstName ?? existing?.firstName ?? null,
    lastName: parsed.data.lastName ?? existing?.lastName ?? null,
    gender: parsed.data.gender !== undefined ? parsed.data.gender : existing?.gender ?? null,
    yearBorn,
    contactNumber:
      parsed.data.contactNumber !== undefined
        ? parsed.data.contactNumber
        : existing?.contactNumber ?? null,
    bestContactTimes:
      parsed.data.bestContactTimes !== undefined
        ? parsed.data.bestContactTimes
        : existing?.bestContactTimes ?? null,
    timeZone:
      parsed.data.timeZone !== undefined ? parsed.data.timeZone : existing?.timeZone ?? null,
    occupation:
      parsed.data.occupation !== undefined ? parsed.data.occupation : existing?.occupation ?? null,
    incomeGoal: existing?.incomeGoal ?? null,
    incomeGoalYear: existing?.incomeGoalYear ?? null,
    incomeGoalRelation: existing?.incomeGoalRelation ?? null,
    isFirstResponder: existing?.isFirstResponder ?? false,
    wantsPracticeGrowth:
      parsed.data.wantsPracticeGrowth ?? existing?.wantsPracticeGrowth ?? false,
    adultConsent,
    wantsPolyamory:
      parsed.data.wantsPolyamory ?? existing?.wantsPolyamory ?? false,
    hadLgdSession:
      parsed.data.hadLgdSession ?? existing?.hadLgdSession ?? false,
    referralSource:
      parsed.data.referralSource !== undefined
        ? parsed.data.referralSource
        : existing?.referralSource ?? null,
    notes: existing?.notes ?? null
  });
  return NextResponse.json({ ok: true });
}
