import { z } from "zod";
import { HOMEPAGE_GOAL_CARDS } from "@/lib/homepage-goals";
import { WELLNESS_BENEFIT_LINKS } from "@/lib/meditation-benefits";

/** Digital lead card form types (paper + QR). */
export const EVENT_LEAD_FORM_TYPES = [
  {
    id: "practice_survey",
    label: "Hypnotherapy Business Practice Survey",
    path: "/lead/practice",
    description: "Expo / healer-coach practice survey (packet, presentation, TXT options)."
  },
  {
    id: "consumer_lead",
    label: "Consumer lead card (Abundance magnet)",
    path: "/lead/consumer",
    description: "General event lead card with goals and free Abundance download."
  }
] as const;

export type EventLeadFormTypeId = (typeof EVENT_LEAD_FORM_TYPES)[number]["id"];

export const EVENT_LEAD_STATUSES = [
  { id: "new", label: "New" },
  { id: "auto_replied", label: "Auto-replied" },
  { id: "contacted", label: "Contacted" },
  { id: "qualified", label: "Qualified" },
  { id: "converted", label: "Converted" },
  { id: "paused", label: "Paused" }
] as const;

export type EventLeadStatusId = (typeof EVENT_LEAD_STATUSES)[number]["id"];

/** Default tagging for Holistic Health Expo practice surveys → Chris. */
export const EXPO_PRACTICE_DEFAULTS = {
  formType: "practice_survey" as EventLeadFormTypeId,
  persona: "Chris - Spiritual Entrepreneur",
  category: "Coaches, studios & practitioners",
  interest: "Facilitator / managed memberships",
  entryPath: "Facilitator / Managed",
  eventName: "Holistic Healing Expo - Long Beach",
  eventDates: "2026-08-01 / 2026-08-02"
};

export const LONG_BEACH_EXPO_2026 = {
  eventName: EXPO_PRACTICE_DEFAULTS.eventName,
  eventDates: EXPO_PRACTICE_DEFAULTS.eventDates,
  eventKey: "holistic-healing-expo-long-beach-2026-08"
} as const;

/** Core RFTS goals for marketing / email targeting. */
export const EVENT_LEAD_CORE_GOALS = HOMEPAGE_GOAL_CARDS.map((g) => g.label);

/** Wellness focus areas (landing pages) for how to market the prospect. */
export const EVENT_LEAD_WELLNESS_FOCUS = WELLNESS_BENEFIT_LINKS.map((b) => b.label);

/** Paper lead-card goal checkboxes (Abundance / Aisha-style). */
export const EVENT_LEAD_CARD_GOALS = [
  "Anger Management",
  "Attract Love",
  "Coaching",
  "Confidence",
  "Creativity",
  "End Pain",
  "End Procrastination",
  "Energy",
  "Explore Past Lives",
  "Health & Rejuvenation",
  "Life Mission",
  "Marketing",
  "Memory Excellence",
  "Motivation",
  "Psychic Abilities",
  "Quit Smoking",
  "Raise Income",
  "Relationship Joy",
  "Retirement $",
  "Sales Skills",
  "Sleep Well",
  "Speaking Skills",
  "Spiritual Growth",
  "Stop Smoking",
  "Stress Management",
  "Time Management",
  "Travel $",
  "Vision",
  "Weight Control"
] as const;

/** Flat list of all selectable goal / focus options (unique, order preserved). */
export const EVENT_LEAD_GOAL_INTERESTS: string[] = Array.from(
  new Set<string>([
    ...EVENT_LEAD_CORE_GOALS,
    ...EVENT_LEAD_WELLNESS_FOCUS,
    ...EVENT_LEAD_CARD_GOALS
  ])
);

const emptyToNull = (v: unknown) => {
  if (v == null) return null;
  if (typeof v === "string" && !v.trim()) return null;
  return v;
};

export function normalizeLeadEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/\s+@\s+/g, "@")
    .replace(/\s+\.\s+/g, ".")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
  if (!cleaned) return null;
  // Require local@domain.tld shape after OCR cleanup.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return null;
  return cleaned;
}

export function normalizeLeadPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw.trim() || null;
}

export function splitLeadName(full: string | null | undefined): {
  firstName: string | null;
  lastName: string | null;
} {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

const optionalString = z.preprocess(
  emptyToNull,
  z.string().trim().max(500).nullable().optional()
);

const cappedStringArray = z
  .array(z.string().trim().max(120))
  .max(40)
  .optional()
  .nullable();

/** Shared contact + event fields on every lead. */
export const eventLeadCoreSchema = z.object({
  formType: z.enum(["practice_survey", "consumer_lead"]),
  eventName: z.string().trim().min(1).max(200),
  eventDates: optionalString,
  eventKey: optionalString,
  firstName: optionalString,
  lastName: optionalString,
  fullName: optionalString,
  email: optionalString,
  phoneMobile: optionalString,
  smsOk: z.boolean().optional().nullable(),
  city: optionalString,
  state: optionalString,
  zip: optionalString,
  country: optionalString,
  persona: optionalString,
  category: optionalString,
  interest: optionalString,
  entryPath: optionalString,
  capturedBy: optionalString,
  notes: optionalString,
  sourceScanPath: optionalString,
  autoReply: z.boolean().optional().nullable()
});

/** Practice survey extras (Expo healer/coach card). */
export const practiceSurveyExtrasSchema = z.object({
  roles: cappedStringArray,
  primaryOccupation: optionalString,
  statusFlags: cappedStringArray,
  otherTraining: optionalString,
  yearPracticeStarted: optionalString,
  timezone: optionalString,
  wantFullTime: z.boolean().optional().nullable(),
  incomeGoalAmount: optionalString,
  incomeGoalYear: optionalString,
  wantPacket: z.boolean().optional().nullable(),
  wantPresentation: z.boolean().optional().nullable(),
  wantTxt: z.boolean().optional().nullable(),
  marginNotes: optionalString,
  goalInterests: cappedStringArray
});

/** Consumer / Aisha-style lead card extras. */
export const consumerLeadExtrasSchema = z.object({
  gotHereVia: optionalString,
  topPriorities: optionalString,
  goalInterests: cappedStringArray,
  position: optionalString,
  businessName: optionalString,
  relationshipStatus: optionalString,
  gender: optionalString,
  age: optionalString,
  isHypnotherapist: z.boolean().optional().nullable(),
  incomeGoalAmount: optionalString,
  incomeGoalYear: optionalString,
  incomeVsCurrent: optionalString,
  spokenWith: optionalString,
  offerCode: optionalString
});

export const eventLeadSubmitSchema = eventLeadCoreSchema
  .extend({
    practice: practiceSurveyExtrasSchema.nullish(),
    consumer: consumerLeadExtrasSchema.nullish()
  })
  .superRefine((data, ctx) => {
    const rawEmail = (data.email ?? "").trim();
    const email = normalizeLeadEmail(data.email ?? null);
    if (rawEmail && !email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid email address.",
        path: ["email"]
      });
    }
    const phone = normalizeLeadPhone(data.phoneMobile ?? null);
    const name =
      [data.firstName, data.lastName].filter(Boolean).join(" ").trim() ||
      (data.fullName || "").trim();
    if (!name && !email && !phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least a name, email, or phone."
      });
    }
  });

export type EventLeadSubmitInput = z.infer<typeof eventLeadSubmitSchema>;

export type EventLeadRecord = {
  id: string;
  formType: EventLeadFormTypeId;
  status: string;
  eventName: string;
  eventDates: string | null;
  eventKey: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  phoneMobile: string | null;
  smsOk: boolean;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  persona: string | null;
  category: string | null;
  interest: string | null;
  entryPath: string | null;
  capturedBy: string | null;
  notes: string | null;
  sourceScanPath: string | null;
  payload: Record<string, unknown>;
  outreachTargetId: string | null;
  autoReplySentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Verified extract from docs/20260803_124059.PDF (Long Beach Expo practice survey). */
export const SARAH_ROSE_LONG_BEACH_EXTRACT: EventLeadSubmitInput = {
  formType: "practice_survey",
  eventName: LONG_BEACH_EXPO_2026.eventName,
  eventDates: LONG_BEACH_EXPO_2026.eventDates,
  eventKey: LONG_BEACH_EXPO_2026.eventKey,
  fullName: "Sarah Rose",
  firstName: "Sarah",
  lastName: "Rose",
  email: "sarahrosehealing@gmail.com",
  phoneMobile: "909-631-5026",
  smsOk: false,
  persona: EXPO_PRACTICE_DEFAULTS.persona,
  category: EXPO_PRACTICE_DEFAULTS.category,
  interest: EXPO_PRACTICE_DEFAULTS.interest,
  entryPath: EXPO_PRACTICE_DEFAULTS.entryPath,
  notes: "Imported from scanned card 20260803_124059.PDF",
  sourceScanPath: "docs/lead-card-scans/20260803_124059-1.jpg",
  autoReply: false,
  practice: {
    roles: ["Healer"],
    primaryOccupation: "Corporate / Operations Manager",
    statusFlags: ["New", "Other training"],
    otherTraining: "Guided Med",
    yearPracticeStarted: "2026",
    timezone: "Other",
    wantFullTime: true,
    incomeGoalAmount: "40000",
    incomeGoalYear: "2027",
    wantPacket: false,
    wantPresentation: false,
    wantTxt: false,
    marginNotes: "Free; Nat Reizkin Akashic Records; Make 90k doing corporate"
  }
};

export function applyLeadDefaults(
  input: EventLeadSubmitInput
): EventLeadSubmitInput {
  const formType = input.formType;
  const { firstName, lastName } = splitLeadName(
    input.fullName || [input.firstName, input.lastName].filter(Boolean).join(" ")
  );
  const base = {
    ...input,
    firstName: input.firstName || firstName,
    lastName: input.lastName || lastName,
    fullName:
      input.fullName ||
      [input.firstName || firstName, input.lastName || lastName].filter(Boolean).join(" ") ||
      null,
    email: normalizeLeadEmail(input.email ?? null),
    phoneMobile: normalizeLeadPhone(input.phoneMobile ?? null)
  };

  if (formType === "practice_survey") {
    return {
      ...base,
      persona: base.persona || EXPO_PRACTICE_DEFAULTS.persona,
      category: base.category || EXPO_PRACTICE_DEFAULTS.category,
      interest: base.interest || EXPO_PRACTICE_DEFAULTS.interest,
      entryPath: base.entryPath || EXPO_PRACTICE_DEFAULTS.entryPath,
      eventName: base.eventName || EXPO_PRACTICE_DEFAULTS.eventName,
      eventDates: base.eventDates || EXPO_PRACTICE_DEFAULTS.eventDates
    };
  }

  return {
    ...base,
    consumer: {
      offerCode: "abundance-magnet",
      ...base.consumer
    }
  };
}

export function displayLeadName(lead: Pick<EventLeadRecord, "fullName" | "firstName" | "lastName">): string {
  return (
    lead.fullName ||
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
    "Unnamed lead"
  );
}
