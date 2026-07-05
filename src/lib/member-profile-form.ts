import { z } from "zod";
import type { MemberProfile } from "@/lib/db";

export const MEMBER_PROFILE_TIME_ZONES = [
  "Pacific Time",
  "Mountain Time",
  "Central Time",
  "Eastern Time",
  "Alaska Time",
  "Hawaii Time",
  "Other"
] as const;

export type MemberProfileDraft = {
  firstName: string;
  lastName: string;
  gender: string;
  yearBorn: string;
  birthDate: string;
  contactNumber: string;
  bestContactTimes: string;
  timeZone: string;
  occupation: string;
  incomeGoal: string;
  incomeGoalYear: string;
  incomeGoalRelation: string;
  isFirstResponder: boolean;
  wantsPracticeGrowth: boolean;
  adultConsent: boolean;
  wantsPolyamory: boolean;
  hadLgdSession: boolean;
  referralSource: string;
};

export function emptyMemberProfileDraft(): MemberProfileDraft {
  return {
    firstName: "",
    lastName: "",
    gender: "",
    yearBorn: "",
    birthDate: "",
    contactNumber: "",
    bestContactTimes: "",
    timeZone: "Pacific Time",
    occupation: "",
    incomeGoal: "",
    incomeGoalYear: "",
    incomeGoalRelation: "",
    isFirstResponder: false,
    wantsPracticeGrowth: false,
    adultConsent: false,
    wantsPolyamory: false,
    hadLgdSession: false,
    referralSource: ""
  };
}

export function memberProfileToDraft(
  profile: Partial<MemberProfile> | null | undefined
): MemberProfileDraft {
  if (!profile) return emptyMemberProfileDraft();
  return {
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    gender: profile.gender || "",
    yearBorn: profile.yearBorn ? String(profile.yearBorn) : "",
    birthDate:
      profile.birthDate?.trim() ||
      (profile.yearBorn ? `${profile.yearBorn}-01-01` : ""),
    contactNumber: profile.contactNumber || "",
    bestContactTimes: profile.bestContactTimes || "",
    timeZone: profile.timeZone || "Pacific Time",
    occupation: profile.occupation || "",
    incomeGoal: profile.incomeGoal || "",
    incomeGoalYear: profile.incomeGoalYear ? String(profile.incomeGoalYear) : "",
    incomeGoalRelation: profile.incomeGoalRelation || "",
    isFirstResponder: !!profile.isFirstResponder,
    wantsPracticeGrowth: !!profile.wantsPracticeGrowth,
    adultConsent: !!profile.adultConsent,
    wantsPolyamory: !!profile.wantsPolyamory,
    hadLgdSession: !!profile.hadLgdSession,
    referralSource: profile.referralSource || ""
  };
}

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
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date YYYY-MM-DD")
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

export const memberProfilePatchSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  gender: z.string().optional(),
  yearBorn: yearSchema,
  birthDate: birthDateSchema,
  contactNumber: z.string().optional(),
  bestContactTimes: z.string().optional(),
  timeZone: z.string().optional(),
  occupation: z.string().optional(),
  incomeGoal: z.string().optional(),
  incomeGoalYear: yearSchema,
  incomeGoalRelation: z.string().optional(),
  isFirstResponder: z.boolean().optional(),
  wantsPracticeGrowth: z.boolean().optional(),
  adultConsent: z.boolean().optional(),
  wantsPolyamory: z.boolean().optional(),
  hadLgdSession: z.boolean().optional(),
  referralSource: z.string().optional(),
  notes: z.string().optional()
});

export type MemberProfilePatch = z.infer<typeof memberProfilePatchSchema>;

export function draftToMemberProfilePatch(draft: MemberProfileDraft): MemberProfilePatch {
  return {
    firstName: draft.firstName,
    lastName: draft.lastName,
    gender: draft.gender,
    yearBorn: draft.yearBorn.trim() ? draft.yearBorn.trim() : undefined,
    birthDate: draft.birthDate.trim() || undefined,
    contactNumber: draft.contactNumber,
    bestContactTimes: draft.bestContactTimes,
    timeZone: draft.timeZone,
    occupation: draft.occupation,
    incomeGoal: draft.incomeGoal,
    incomeGoalYear: draft.incomeGoalYear.trim() ? draft.incomeGoalYear.trim() : undefined,
    incomeGoalRelation: draft.incomeGoalRelation,
    isFirstResponder: draft.isFirstResponder,
    wantsPracticeGrowth: draft.wantsPracticeGrowth,
    adultConsent: draft.adultConsent,
    wantsPolyamory: draft.wantsPolyamory,
    hadLgdSession: draft.hadLgdSession,
    referralSource: draft.referralSource
  };
}

export function buildUpsertMemberProfilePayload(
  userId: string,
  existing: Partial<MemberProfile> | null | undefined,
  patch: MemberProfilePatch
): MemberProfile {
  const birthDate = patch.birthDate ?? existing?.birthDate ?? null;
  const yearFromBirthDate =
    birthDate != null
      ? (() => {
          const y = parseInt(birthDate.slice(0, 4), 10);
          return !Number.isNaN(y) && y >= 1900 && y <= 2100 ? y : null;
        })()
      : null;
  const yearBorn = yearFromBirthDate ?? patch.yearBorn ?? existing?.yearBorn ?? null;
  const currentYear = new Date().getFullYear();
  const isAgeVerified = yearBorn != null && currentYear - yearBorn >= 18;
  const rawAdultConsent = patch.adultConsent ?? existing?.adultConsent ?? false;
  const adultConsent = rawAdultConsent && isAgeVerified;

  return {
    userId,
    firstName: patch.firstName ?? existing?.firstName ?? null,
    lastName: patch.lastName ?? existing?.lastName ?? null,
    gender: patch.gender ?? existing?.gender ?? null,
    yearBorn,
    birthDate: birthDate ?? undefined,
    contactNumber: patch.contactNumber ?? existing?.contactNumber ?? null,
    bestContactTimes: patch.bestContactTimes ?? existing?.bestContactTimes ?? null,
    timeZone: patch.timeZone ?? existing?.timeZone ?? null,
    occupation: patch.occupation ?? existing?.occupation ?? null,
    incomeGoal: patch.incomeGoal ?? existing?.incomeGoal ?? null,
    incomeGoalYear: patch.incomeGoalYear ?? existing?.incomeGoalYear ?? null,
    incomeGoalRelation: patch.incomeGoalRelation ?? existing?.incomeGoalRelation ?? null,
    isFirstResponder: patch.isFirstResponder ?? existing?.isFirstResponder ?? false,
    wantsPracticeGrowth:
      patch.wantsPracticeGrowth ?? existing?.wantsPracticeGrowth ?? false,
    adultConsent,
    wantsPolyamory: patch.wantsPolyamory ?? existing?.wantsPolyamory ?? false,
    hadLgdSession: patch.hadLgdSession ?? existing?.hadLgdSession ?? false,
    referralSource: patch.referralSource ?? existing?.referralSource ?? null,
    notes:
      patch.notes !== undefined ? patch.notes ?? null : existing?.notes ?? null
  };
}

export function memberDraftShowsAdultContentOptions(draft: MemberProfileDraft): boolean {
  const yearNum = parseInt(draft.yearBorn.trim() || draft.birthDate.slice(0, 4), 10);
  return (
    Number.isInteger(yearNum) &&
    yearNum >= 1900 &&
    yearNum <= 2100 &&
    new Date().getFullYear() - yearNum >= 18
  );
}
