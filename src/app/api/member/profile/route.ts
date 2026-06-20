import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSessionEmail } from "@/lib/user-auth";
import {
  getMemberProfileByUserId,
  getUserProfile,
  upsertMemberProfile
} from "@/lib/db";
import { getMemberBillingSummary } from "@/lib/member-billing";
import { getMemberAffiliateSummary } from "@/lib/member-affiliate";
import { parseAffiliatePayoutInput } from "@/lib/affiliate-payout";
import { getWelcomeEmailCcRecipients, sendEmail } from "@/lib/email";
import {
  getLgdInterestEmailContent,
  getTherapistHealerCoachEmailContent
} from "@/lib/email-templates";

const yearSchema = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = typeof v === "string" ? parseInt(v, 10) : v;
    if (Number.isNaN(n) || n < 1900 || n > 2100) return undefined;
    return n;
  });

const birthDateSchema = z
  .string()
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    if (!s) return undefined;
    const datePart = s.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
    return undefined;
  });

const updateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  gender: z.string().optional(),
  yearBorn: yearSchema,
  birthDate: birthDateSchema,
  contactNumber: z.string().optional(),
  bestContactTimes: z.string().optional(),
  timeZone: z.string().optional(),
  occupation: z.string().optional(),
  wantsPracticeGrowth: z.boolean().optional(),
  adultConsent: z.boolean().optional(),
  wantsPolyamory: z.boolean().optional(),
  hadLgdSession: z.boolean().optional(),
  referralSource: z.string().optional(),
  affiliatePayoutMethod: z.string().optional(),
  affiliatePayoutDetail: z.string().optional()
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
  const billing = await getMemberBillingSummary(user);
  const affiliate = await getMemberAffiliateSummary(user.id, user.email);
  const memberProfile = await getMemberProfileByUserId(user.id);
  if (!memberProfile) {
    return NextResponse.json({
      billing,
      affiliate,
      profile: {
        email: user.email,
        firstName: null,
        lastName: null,
        gender: null,
        yearBorn: null,
        birthDate: null,
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
  const yearBornNum = memberProfile.yearBorn ?? null;
  const birthDate = memberProfile.birthDate ?? null;
  return NextResponse.json({
    billing,
    affiliate,
    profile: {
      email: user.email,
      firstName: memberProfile.firstName ?? null,
      lastName: memberProfile.lastName ?? null,
      gender: memberProfile.gender ?? null,
      yearBorn: yearBornNum,
      birthDate,
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
  let affiliatePayoutMethod = existing?.affiliatePayoutMethod ?? null;
  let affiliatePayoutDetail = existing?.affiliatePayoutDetail ?? null;
  if (parsed.data.affiliatePayoutMethod !== undefined) {
    const payoutParsed = parseAffiliatePayoutInput({
      payoutMethod: parsed.data.affiliatePayoutMethod,
      payoutDetail: parsed.data.affiliatePayoutDetail
    });
    if (!payoutParsed.success) {
      return NextResponse.json({ error: "Invalid payout details." }, { status: 400 });
    }
    affiliatePayoutMethod = payoutParsed.data.payoutMethod;
    affiliatePayoutDetail = payoutParsed.data.payoutDetail?.trim() || null;
  }
  const rawBirthDate = parsed.data.birthDate;
  const birthDate =
    typeof rawBirthDate === "string" && rawBirthDate.trim().length >= 10
      ? rawBirthDate.trim().slice(0, 10)
      : rawBirthDate ?? existing?.birthDate ?? null;
  const yearBornFromBirthDate =
    birthDate != null
      ? (() => {
          const y = parseInt(birthDate.slice(0, 4), 10);
          return !Number.isNaN(y) && y >= 1900 && y <= 2100 ? y : null;
        })()
      : null;
  const yearBorn = yearBornFromBirthDate ?? parsed.data.yearBorn ?? existing?.yearBorn ?? null;
  const currentYear = new Date().getFullYear();
  const isAgeVerified = yearBorn != null && currentYear - yearBorn >= 18;
  const rawAdultConsent = parsed.data.adultConsent ?? existing?.adultConsent ?? false;
  const adultConsent = rawAdultConsent && isAgeVerified;

  try {
    await upsertMemberProfile({
      userId: user.id,
      firstName: parsed.data.firstName ?? existing?.firstName ?? null,
      lastName: parsed.data.lastName ?? existing?.lastName ?? null,
      gender: parsed.data.gender !== undefined ? parsed.data.gender : existing?.gender ?? null,
      yearBorn,
      birthDate: birthDate ?? undefined,
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
    notes: existing?.notes ?? null,
    affiliatePayoutMethod,
    affiliatePayoutDetail
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/member/profile]", message);
    if (message.includes("birth_date") || message.includes("column")) {
      return NextResponse.json(
        { error: "Database may need a schema update. Run: npm run db:schema" },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Save failed." }, { status: 500 });
  }

  const newHadLgd =
    parsed.data.hadLgdSession ?? existing?.hadLgdSession ?? false;
  const newWantsPracticeGrowth =
    parsed.data.wantsPracticeGrowth ?? existing?.wantsPracticeGrowth ?? false;
  const prevHadLgd = existing?.hadLgdSession ?? false;
  const prevWantsPracticeGrowth = existing?.wantsPracticeGrowth ?? false;
  const firstName =
    parsed.data.firstName ?? existing?.firstName ?? null;

  if (newHadLgd && !prevHadLgd) {
    const lgd = getLgdInterestEmailContent(firstName);
    const lgdResult = await sendEmail({
      to: email,
      cc: getWelcomeEmailCcRecipients(),
      subject: lgd.subject,
      html: lgd.html,
      text: lgd.text,
      skipStaffBcc: true
    });
    if (!lgdResult.ok) {
      console.error("[PATCH /api/member/profile] LGD interest email failed:", lgdResult.error);
    }
  }
  if (newWantsPracticeGrowth && !prevWantsPracticeGrowth) {
    const thc = getTherapistHealerCoachEmailContent(firstName);
    const thcResult = await sendEmail({
      to: email,
      cc: getWelcomeEmailCcRecipients(),
      subject: thc.subject,
      html: thc.html,
      text: thc.text,
      skipStaffBcc: true
    });
    if (!thcResult.ok) {
      console.error("[PATCH /api/member/profile] Therapist/healer/coach email failed:", thcResult.error);
    }
  }

  return NextResponse.json({ ok: true });
}
