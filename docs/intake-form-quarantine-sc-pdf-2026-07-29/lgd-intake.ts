/**
 * Electronic Life Guidance Discovery (LGD) — field model, script skeleton,
 * voice catalog, and facilitator feature flags.
 * Full product design: docs/LGD_ELECTRONIC_INTAKE.md
 */

import {
  buildTerryCgmrClose,
  buildTerryCgmrInductionAndDeepener
} from "@/lib/terry-cgmr-shared-script";

export const LGD_INTAKE_VERSION = 4 as const;

export type LgdIntakeEditorRole = "admin" | "member" | "facilitator";

export type LgdIntakeEditEvent = {
  at: string;
  byRole: LgdIntakeEditorRole;
  byEmail: string;
  byName?: string | null;
  action:
    | "save_answers"
    | "submit"
    | "authorize_member_edit"
    | "revoke_member_edit"
    | "create_draft";
  note?: string;
};

/** Member may edit the form when paid, or when a facilitator/admin authorized edits. */
export function canMemberEditLgdForm(intake: {
  status: string;
  paidAt?: string | null;
  memberEditAuthorizedAt?: string | null;
}): boolean {
  if (intake.status === "cancelled") return false;
  if (intake.status === "draft") return !!intake.paidAt;
  return !!intake.paidAt || !!intake.memberEditAuthorizedAt;
}

export function normalizeLgdEditHistory(raw: unknown): LgdIntakeEditEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: LgdIntakeEditEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Partial<LgdIntakeEditEvent>;
    const at = String(o.at ?? "").trim();
    const byEmail = String(o.byEmail ?? "").trim().toLowerCase();
    const byRole = o.byRole;
    const action = o.action;
    if (!at || !byEmail) continue;
    if (byRole !== "admin" && byRole !== "member" && byRole !== "facilitator") continue;
    if (
      action !== "save_answers" &&
      action !== "submit" &&
      action !== "authorize_member_edit" &&
      action !== "revoke_member_edit" &&
      action !== "create_draft"
    ) {
      continue;
    }
    out.push({
      at,
      byRole,
      byEmail,
      byName: o.byName ? String(o.byName) : null,
      action,
      note: o.note ? String(o.note) : undefined
    });
  }
  return out.slice(-100);
}

export const LGD_LIFE_AREAS = [
  { id: "physical", label: "Physical / health" },
  { id: "mental", label: "Mental / focus" },
  { id: "emotional", label: "Emotional" },
  { id: "spiritual", label: "Spiritual" },
  { id: "financial", label: "Financial" },
  { id: "relationship", label: "Relationship" },
  { id: "work_mission", label: "Work / life mission" },
  { id: "sleep_energy", label: "Sleep / energy" }
] as const;

export type LgdLifeAreaId = (typeof LGD_LIFE_AREAS)[number]["id"];

/**
 * Full Success Center Challenges Checklist (paper `Client_Intake_Form_fillable.pdf`, page 5) —
 * every checkbox item, with optional detail subfields where the paper form has them
 * (e.g. which drug, weight/height/desired, cigarettes/day, income bands).
 * Member checks applicable items, then ranks up to 10 priorities.
 */
export const LGD_CHALLENGE_CATEGORIES = [
  { id: "emotional", label: "Emotional" },
  { id: "relationship", label: "Relationship / communication" },
  { id: "focus", label: "Focus, memory & learning" },
  { id: "success", label: "Success & money" },
  { id: "spirit", label: "Spirit" },
  { id: "health", label: "Health & habits" }
] as const;

export type LgdChallengeCategoryId = (typeof LGD_CHALLENGE_CATEGORIES)[number]["id"];

export type LgdChallengeDetailField = {
  id: string;
  label: string;
  placeholder?: string;
};

export const LGD_CHALLENGES = [
  // Emotional
  { id: "unwanted_emotions", category: "emotional", label: "Unwanted emotions I can’t shake" },
  { id: "wanted_emotions_absent", category: "emotional", label: "Wanted emotions are absent (numbness)" },
  {
    id: "depressed",
    category: "emotional",
    label: "Depressed / frequent sadness",
    detailFields: [{ id: "howOften", label: "How often?" }]
  },
  {
    id: "fear_phobia_of",
    category: "emotional",
    label: "Fear / phobia of…",
    detailFields: [{ id: "specify", label: "Fear / phobia of what?" }]
  },
  { id: "afraid_of_people", category: "emotional", label: "Afraid of people" },
  { id: "low_self_esteem", category: "emotional", label: "Low self-esteem / self-worth" },
  {
    id: "thought_about_suicide",
    category: "emotional",
    label: "Thought about suicide",
    detailFields: [{ id: "lastTime", label: "Last time (date)" }]
  },
  { id: "fear_of_dying", category: "emotional", label: "Fear of dying" },
  { id: "too_emotional", category: "emotional", label: "Too emotional" },
  { id: "too_nervous", category: "emotional", label: "Too nervous" },
  { id: "guilt_feelings", category: "emotional", label: "Guilt feelings that won’t release" },
  { id: "negative_reaction_to_stress", category: "emotional", label: "Negative reaction to stress / feeling overwhelmed" },
  { id: "social_anxiety", category: "emotional", label: "Social anxiety" },
  { id: "difficulty_relaxing", category: "emotional", label: "Difficulty relaxing / can’t unwind" },
  { id: "no_time_to_relax", category: "emotional", label: "No time to relax" },
  { id: "need_more_fun", category: "emotional", label: "Need more fun" },
  { id: "easily_influenced", category: "emotional", label: "Easily influenced" },
  { id: "bad_dreams", category: "emotional", label: "Bad dreams" },
  { id: "feel_awkward", category: "emotional", label: "Feel awkward" },
  {
    id: "cannot_express_emotions",
    category: "emotional",
    label: "Cannot express emotions",
    detailFields: [{ id: "specify", label: "Specify" }]
  },
  { id: "frequent_crying", category: "emotional", label: "Frequent crying" },
  {
    id: "different_from_others",
    category: "emotional",
    label: "Feel different from others",
    detailFields: [{ id: "how", label: "How?" }]
  },
  { id: "fear_responsibility", category: "emotional", label: "Fear responsibility" },
  { id: "quick_to_anger", category: "emotional", label: "Quick to anger / frustration responses" },
  { id: "too_critical_of_others", category: "emotional", label: "Too critical of others" },
  { id: "violent", category: "emotional", label: "Violent" },
  { id: "verbally_abusive_when_angry", category: "emotional", label: "Verbally abusive when angry" },
  { id: "too_sensitive", category: "emotional", label: "Too sensitive" },
  { id: "feel_sad_frequently", category: "emotional", label: "Feel sad frequently" },
  { id: "too_pessimistic", category: "emotional", label: "Too pessimistic" },

  // Relationship / communication
  { id: "do_not_communicate", category: "relationship", label: "Difficulty communicating / feeling misunderstood" },
  { id: "speech_problems", category: "relationship", label: "Speech problems" },
  { id: "do_not_trust_others", category: "relationship", label: "Do not trust others" },
  { id: "dislike_people", category: "relationship", label: "Dislike people" },
  {
    id: "not_assertive",
    category: "relationship",
    label: "Am not assertive",
    detailFields: [{ id: "context", label: "Business / personal" }]
  },
  { id: "difficulties_making_friends", category: "relationship", label: "Difficulties making friends" },
  { id: "too_shy", category: "relationship", label: "Too shy" },
  {
    id: "hard_to_meet_people",
    category: "relationship",
    label: "Hard to meet people",
    detailFields: [{ id: "context", label: "Business / personal" }]
  },
  { id: "feel_lonely", category: "relationship", label: "Feel lonely" },
  {
    id: "still_grieving",
    category: "relationship",
    label: "Still grieving a loss",
    detailFields: [
      { id: "name", label: "Name" },
      { id: "monthYear", label: "Month / year" }
    ]
  },
  { id: "want_love_relationship", category: "relationship", label: "Want a quality love relationship" },
  { id: "relationship_enhancement", category: "relationship", label: "Improve an existing love relationship" },
  { id: "sexual_difficulties", category: "relationship", label: "Sexual difficulties" },
  { id: "desire_more_sex", category: "relationship", label: "Desire more sex" },
  { id: "unhappy_marriage", category: "relationship", label: "Unhappy marriage" },
  { id: "divorce", category: "relationship", label: "Divorce" },
  { id: "relationship_breakup", category: "relationship", label: "Relationship breakup" },
  { id: "trouble_with_children", category: "relationship", label: "Trouble with children" },
  { id: "trouble_with_loved_ones", category: "relationship", label: "Trouble with loved ones" },
  { id: "quarreling_at_home", category: "relationship", label: "Quarreling at home" },

  // Focus, memory & learning
  {
    id: "memory",
    category: "focus",
    label: "Poor memory",
    detailFields: [{ id: "usedToBeBetterFor", label: "Used to be better for…" }]
  },
  { id: "studying_is_dull", category: "focus", label: "Studying is dull" },
  { id: "read_too_slow", category: "focus", label: "Read too slow" },
  { id: "concentration_focus", category: "focus", label: "Poor concentration / focus" },
  { id: "lack_imagination", category: "focus", label: "Lack imagination" },
  { id: "creativity_block", category: "focus", label: "Creativity block / inspiration" },
  { id: "overwhelm_information", category: "focus", label: "Overwhelmed by too much information" },

  // Success & money
  { id: "need_a_job", category: "success", label: "Need a job" },
  { id: "worn_out_by_job", category: "success", label: "Worn out by job" },
  { id: "cannot_save_money", category: "success", label: "Cannot save money" },
  { id: "retirement_planning", category: "success", label: "Retirement planning" },
  { id: "cannot_get_ahead", category: "success", label: "Cannot get ahead" },
  {
    id: "problems_with_others_at_work",
    category: "success",
    label: "Problems with co-workers / employees / boss",
    detailFields: [{ id: "who", label: "Who? (co-workers / employees / boss)" }]
  },
  { id: "dislike_job", category: "success", label: "Dislike job" },
  { id: "school_problems", category: "success", label: "Problems related to school" },
  { id: "too_much_spare_time", category: "success", label: "Too much spare time" },
  { id: "desire_promotion", category: "success", label: "Desire a promotion" },
  {
    id: "want_to_change_business_or_job",
    category: "success",
    label: "Want to change business or job",
    detailFields: [{ id: "which", label: "Business / jobs" }]
  },
  { id: "work_too_dull", category: "success", label: "Work too dull" },
  {
    id: "afraid_to_take_risks",
    category: "success",
    label: "Afraid to take risks",
    detailFields: [{ id: "context", label: "Business / personal" }]
  },
  { id: "blame_others", category: "success", label: "Blame others" },
  { id: "need_more_goals", category: "success", label: "Need more goals" },
  { id: "lack_of_skills", category: "success", label: "Lack of skills" },
  { id: "lack_motivation", category: "success", label: "Lack of motivation / ambition" },
  { id: "trouble_making_decisions", category: "success", label: "Trouble making decisions" },
  {
    id: "lack_of_education",
    category: "success",
    label: "Lack of education",
    detailFields: [{ id: "willingToTakeClasses", label: "Willing to take classes?" }]
  },
  {
    id: "poor_organization",
    category: "success",
    label: "Poor organization",
    detailFields: [{ id: "area", label: "Time / space" }]
  },
  {
    id: "procrastination",
    category: "success",
    label: "Procrastinate a lot",
    detailFields: [{ id: "area", label: "Work / personal" }]
  },
  { id: "self_sabotage", category: "success", label: "Self-sabotage / can’t get ahead" },
  { id: "financial_independence", category: "success", label: "Financial independence" },
  {
    id: "raise_income",
    category: "success",
    label: "Raise income / earning power",
    detailFields: [
      { id: "presentIncome", label: "Present income" },
      { id: "desiredIncome", label: "Desired income" },
      { id: "whatYear", label: "By what year" }
    ]
  },
  {
    id: "public_speaking",
    category: "success",
    label: "Public speaking",
    detailFields: [{ id: "concern", label: "Fears / lack of skill" }]
  },
  {
    id: "legal_problems",
    category: "success",
    label: "Legal problems",
    detailFields: [{ id: "hasLegalInsurance", label: "Have legal insurance?" }]
  },
  {
    id: "other_concerns",
    category: "success",
    label: "Other concerns",
    detailFields: [{ id: "specify", label: "Please specify" }]
  },

  // Spirit
  { id: "spiritual_growth", category: "spirit", label: "Desire spiritual growth" },
  { id: "life_mission", category: "spirit", label: "Want to know my life mission" },
  { id: "spiritual_problems", category: "spirit", label: "Spiritual problems" },

  // Health & habits
  { id: "difficulty_falling_asleep", category: "health", label: "Difficulty getting to sleep" },
  { id: "cannot_stay_asleep", category: "health", label: "Cannot stay asleep" },
  {
    id: "bad_habits",
    category: "health",
    label: "Bad habits",
    detailFields: [{ id: "which", label: "Which habits?" }]
  },
  {
    id: "drug_problems",
    category: "health",
    label: "Drug problems",
    detailFields: [{ id: "whichDrug", label: "Which drug?" }]
  },
  {
    id: "drink_too_much",
    category: "health",
    label: "Drink too much",
    detailFields: [{ id: "howMuchWhat", label: "How much of what?" }]
  },
  {
    id: "weight_problems",
    category: "health",
    label: "Weight problems",
    detailFields: [
      { id: "weight", label: "Weight" },
      { id: "height", label: "Height" },
      { id: "desiredWeight", label: "Desired weight" }
    ]
  },
  {
    id: "eat_too_much",
    category: "health",
    label: "Eat too much",
    detailFields: [{ id: "whatKind", label: "Sweets / junk food / other" }]
  },
  {
    id: "not_enough_exercise",
    category: "health",
    label: "Not enough exercise",
    detailFields: [{ id: "frequency", label: "How much, per day/week" }]
  },
  {
    id: "dissatisfied_with_appearance",
    category: "health",
    label: "Dissatisfied with appearance",
    detailFields: [{ id: "why", label: "Why?" }]
  },
  {
    id: "want_to_quit_smoking",
    category: "health",
    label: "Want to quit smoking",
    detailFields: [{ id: "cigarettesPerDay", label: "Cigarettes per day" }]
  },
  {
    id: "aging_faster_than_prefer",
    category: "health",
    label: "Aging faster than I prefer",
    detailFields: [{ id: "desire", label: "Desire rejuvenation / healthy longevity" }]
  },
  {
    id: "poor_vision",
    category: "health",
    label: "Poor vision",
    detailFields: [{ id: "wearGlasses", label: "Wear glasses?" }]
  },
  { id: "desire_to_see_well_without_glasses", category: "health", label: "Desire to see well without glasses" },
  { id: "hearing_impairment", category: "health", label: "Hearing impairment" },
  { id: "cannot_get_up_mornings", category: "health", label: "Cannot get up mornings" },
  { id: "get_sick_a_lot", category: "health", label: "Get sick a lot" },
  {
    id: "fear_of_health_or_mental_decline",
    category: "health",
    label: "Fear of health or mental state getting worse",
    detailFields: [{ id: "which", label: "Health / mental state" }]
  },
  { id: "lack_of_energy", category: "health", label: "Lack of energy / fatigue" },
  { id: "take_food_supplements", category: "health", label: "Takes food supplements" },
  {
    id: "blood_pressure",
    category: "health",
    label: "Blood pressure concerns",
    detailFields: [{ id: "highOrLow", label: "High / low" }]
  },
  { id: "menopause_difficulties", category: "health", label: "Menopause difficulties" },
  {
    id: "allergies",
    category: "health",
    label: "Allergies",
    detailFields: [
      { id: "to", label: "Allergic to" },
      { id: "symptoms", label: "Symptoms" }
    ]
  },
  { id: "physical_pain", category: "health", label: "Physical pain / discomfort (non-medical focus)" }
] as const;

export type LgdChallengeId = (typeof LGD_CHALLENGES)[number]["id"];

const CHALLENGE_IDS = new Set(LGD_CHALLENGES.map((c) => c.id));

/**
 * Pre-v4 curated checklist used a smaller id set. Map old ids saved in existing
 * intakes onto the closest full-inventory id so historical answers keep loading.
 */
const LEGACY_CHALLENGE_ALIASES: Record<string, LgdChallengeId> = {
  anger_issues: "quick_to_anger",
  depression_sadness: "depressed",
  fear_anxiety: "fear_phobia_of",
  guilt: "guilt_feelings",
  stress_overwhelm: "negative_reaction_to_stress",
  communication_difficulty: "do_not_communicate",
  loneliness: "feel_lonely",
  trust_issues: "do_not_trust_others",
  grief: "still_grieving",
  sleep_issues: "difficulty_falling_asleep",
  weight_habits: "weight_problems",
  exercise_consistency: "not_enough_exercise",
  aging_longevity: "aging_faster_than_prefer",
  relaxation: "difficulty_relaxing",
  pain_discomfort: "physical_pain",
  energy_fatigue: "lack_of_energy",
  spiritual_blocks: "spiritual_problems",
  organization_time: "poor_organization"
};

function resolveChallengeId(rawId: string): string {
  return LEGACY_CHALLENGE_ALIASES[rawId] ?? rawId;
}

export function lgdChallengeLabel(id: string): string {
  return LGD_CHALLENGES.find((c) => c.id === id)?.label ?? id;
}

export function lgdChallengeDetailFields(id: string): readonly LgdChallengeDetailField[] {
  const challenge = LGD_CHALLENGES.find((c) => c.id === id);
  return (challenge as { detailFields?: readonly LgdChallengeDetailField[] } | undefined)
    ?.detailFields ?? [];
}

export function lgdChallengeCategoryLabel(categoryId: string): string {
  return LGD_CHALLENGE_CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId;
}

/** Prioritized challenges (1 = highest), max 10. */
export function prioritizedLgdChallenges(answers: {
  challengePriority?: string[];
  challengeIds?: string[];
  challengeDetails?: Partial<Record<string, Record<string, string>>>;
}): {
  priority: number;
  id: LgdChallengeId;
  label: string;
  category: LgdChallengeCategoryId;
  details?: Record<string, string>;
}[] {
  const order = Array.isArray(answers.challengePriority) ? answers.challengePriority : [];
  const out: {
    priority: number;
    id: LgdChallengeId;
    label: string;
    category: LgdChallengeCategoryId;
    details?: Record<string, string>;
  }[] = [];
  for (const id of order) {
    const row = LGD_CHALLENGES.find((c) => c.id === id);
    if (!row) continue;
    out.push({
      priority: out.length + 1,
      id: row.id,
      label: row.label,
      category: row.category,
      details: answers.challengeDetails?.[row.id]
    });
    if (out.length >= 10) break;
  }
  return out;
}

/**
 * Seven Keys to Self-Actualization (Success Center / Terry Brussel-Rogers).
 * Bronze is always first; members order the remaining Keys that apply.
 */
export const LGD_SEVEN_KEYS = [
  {
    id: "bronze",
    metal: "Bronze",
    label: "Auto-suggestion & self-hypnosis",
    summary:
      "Heightened sensory awareness, emotional control, decision-making, and the Will to Learn — the foundation before every other Key."
  },
  {
    id: "copper",
    metal: "Copper",
    label: "Memory enhancement",
    summary:
      "Photo/phonographic memory, focus, comprehension, rapid learning, names and faces."
  },
  {
    id: "silver",
    metal: "Silver",
    label: "Creativity & inspiration",
    summary:
      "Inspiration at will; remove blocks to speaking, writing, problem-solving, and creative talents."
  },
  {
    id: "diamond",
    metal: "Diamond",
    label: "Success",
    summary:
      "Remove blocks to personal and business success; motivation, NLP-informed communication, career skills."
  },
  {
    id: "gold",
    metal: "Gold",
    label: "Body awareness & health",
    summary:
      "Stress, weight, comfort, athletic skill, vision/hearing support, rejuvenation — body cooperating with goals."
  },
  {
    id: "ruby",
    metal: "Ruby",
    label: "Relationship establishment & enhancement",
    summary:
      "Choose, attract, and deepen quality relationships — life mate, partnership, or family bonds."
  },
  {
    id: "platinum",
    metal: "Platinum",
    label: "Spiritual growth",
    summary:
      "Higher Self, meaning, psychic/spiritual development options, and helper-healer skills when chosen."
  }
] as const;

export type LgdSevenKeyId = (typeof LGD_SEVEN_KEYS)[number]["id"];

const SEVEN_KEY_IDS = new Set(LGD_SEVEN_KEYS.map((k) => k.id));
export const LGD_BRONZE_KEY_ID: LgdSevenKeyId = "bronze";

export function lgdSevenKeyById(id: string) {
  return LGD_SEVEN_KEYS.find((k) => k.id === id) ?? null;
}

/** Ordered Keys for brief/UI — Bronze always rank 1 when any Keys are set. */
export function orderedLgdSevenKeys(answers: {
  sevenKeysOrder?: string[];
}): { rank: number; id: LgdSevenKeyId; metal: string; label: string; summary: string }[] {
  const order = normalizeSevenKeysOrder(answers.sevenKeysOrder);
  return order.map((id, i) => {
    const key = lgdSevenKeyById(id)!;
    return {
      rank: i + 1,
      id: key.id,
      metal: key.metal,
      label: key.label,
      summary: key.summary
    };
  });
}

export function normalizeSevenKeysOrder(raw: unknown): LgdSevenKeyId[] {
  const ids: LgdSevenKeyId[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const id = String(item ?? "").trim() as LgdSevenKeyId;
      if (!SEVEN_KEY_IDS.has(id) || ids.includes(id)) continue;
      ids.push(id);
    }
  }
  const withoutBronze = ids.filter((id) => id !== "bronze");
  // Bronze is always first when the member engages the Keys path.
  if (ids.length === 0) return ["bronze"];
  const ordered: LgdSevenKeyId[] = ["bronze", ...withoutBronze];
  return ordered.slice(0, 7);
}

/**
 * Premise: “How would you like your subconscious programmed?”
 * Multi-select — shapes induction / support tone in the script draft.
 */
export const LGD_SUBCONSCIOUS_PROGRAMS = [
  {
    id: "release_limiting",
    label: "Release limiting beliefs that hold me back",
    scriptCue:
      "You allow old limiting beliefs to soften and release, making room for truth that helps you grow."
  },
  {
    id: "install_identity",
    label: "Install empowering identity (“I am becoming…” / “I am now…”)",
    scriptCue:
      "Night after night, empowering identity statements settle as your natural way of being."
  },
  {
    id: "goal_focus",
    label: "Keep my prioritized goals front and center while I sleep",
    scriptCue:
      "Your prioritized goals stay clear and active in the subconscious while you rest."
  },
  {
    id: "calm_rest",
    label: "Calm my nervous system so I rest deeply and receive",
    scriptCue:
      "Your nervous system settles. You rest deeply and receive what supports you."
  },
  {
    id: "confidence_action",
    label: "Build confidence and follow-through by day",
    scriptCue:
      "Confidence and follow-through grow naturally in your waking choices."
  },
  {
    id: "abundance_allowed",
    label: "Allow success, abundance, and being valued for my contribution",
    scriptCue:
      "Success and abundance are allowed. You are valued for your contribution."
  },
  {
    id: "self_worth",
    label: "Strengthen self-worth and self-compassion",
    scriptCue:
      "Self-worth and self-compassion become steady companions."
  },
  {
    id: "focus_clarity",
    label: "Clear mental clutter and focus on what matters most",
    scriptCue:
      "Mental clutter clears. You focus easily on what matters most."
  },
  {
    id: "relationship_open",
    label: "Open to healthier connection, communication, and boundaries",
    scriptCue:
      "You open to healthier connection, clear communication, and kind boundaries."
  },
  {
    id: "thrive_expand",
    label: "Help me grow, expand, and thrive in all areas of life",
    scriptCue:
      "You grow, expand, and thrive — physically, mentally, emotionally, spiritually, and financially."
  }
] as const;

export type LgdSubconsciousProgramId =
  (typeof LGD_SUBCONSCIOUS_PROGRAMS)[number]["id"];

/** Common limiting beliefs (multiple choice) with a default growth reframe. */
export const LGD_LIMITING_BELIEF_CHOICES = [
  {
    id: "not_enough",
    label: "I'm not enough / I don't measure up",
    defaultGrowthId: "enough_growing"
  },
  {
    id: "do_it_alone",
    label: "I have to do everything myself",
    defaultGrowthId: "allow_support"
  },
  {
    id: "success_hard",
    label: "Success has to be hard or I don't deserve ease",
    defaultGrowthId: "ease_allowed"
  },
  {
    id: "cant_change",
    label: "I can't really change / this is just who I am",
    defaultGrowthId: "can_change"
  },
  {
    id: "not_safe_rest",
    label: "I can't rest until everything else is handled",
    defaultGrowthId: "safe_rest"
  },
  {
    id: "money_bad",
    label: "Money / success isn't spiritual or safe for me",
    defaultGrowthId: "abundance_aligned"
  },
  {
    id: "will_fail",
    label: "I'll probably fail if I try something important",
    defaultGrowthId: "learn_succeed"
  },
  {
    id: "others_first",
    label: "Others' needs always come before mine",
    defaultGrowthId: "balanced_care"
  },
  {
    id: "unlovable",
    label: "I'm hard to love / connection isn't for me",
    defaultGrowthId: "worthy_love"
  },
  {
    id: "stuck_past",
    label: "My past defines what I can become",
    defaultGrowthId: "future_open"
  }
] as const;

export type LgdLimitingBeliefId = (typeof LGD_LIMITING_BELIEF_CHOICES)[number]["id"];

/** Growth / thriving beliefs to install (multiple choice). */
export const LGD_GROWTH_BELIEF_CHOICES = [
  {
    id: "enough_growing",
    label: "I am enough, and I grow stronger every day."
  },
  {
    id: "allow_support",
    label: "I allow support and still lead with clarity."
  },
  {
    id: "ease_allowed",
    label: "Ease and success can travel together for me."
  },
  {
    id: "can_change",
    label: "I can change. New patterns become natural with repetition."
  },
  {
    id: "safe_rest",
    label: "I am safe to rest. Rest renews my clarity and power."
  },
  {
    id: "abundance_aligned",
    label: "Abundance and right action grow side by side in my life."
  },
  {
    id: "learn_succeed",
    label: "I learn, adjust, and succeed — one clear step at a time."
  },
  {
    id: "balanced_care",
    label: "I care for myself and others with healthy balance."
  },
  {
    id: "worthy_love",
    label: "I am worthy of love, respect, and real connection."
  },
  {
    id: "future_open",
    label: "My future is open. I become who I choose to be."
  },
  {
    id: "thrive_expand",
    label: "I grow, expand, and thrive in ways that feel true for me."
  },
  {
    id: "custom",
    label: "Custom (write my own below)"
  }
] as const;

export type LgdGrowthBeliefId = (typeof LGD_GROWTH_BELIEF_CHOICES)[number]["id"];

export type LgdBeliefTransformation = {
  limitingId: LgdLimitingBeliefId | "custom";
  limitingText: string;
  growthId: LgdGrowthBeliefId | "custom";
  growthText: string;
};

/**
 * Hypnotic voice catalog for CGMR overnight programming.
 * First priority for every option: calm, continuous, sleep-inducing delivery
 * that helps the subconscious accept suggestions — then gender/tone color.
 */
export const LGD_PROFESSIONAL_VOICES = [
  {
    id: "terry",
    label: "Terry Brussel-Rogers",
    description:
      "Signature Success Center hypnotic voice — warm, trusted, peaceful authority for sleep programming.",
    presentation: "feminine",
    toneFamily: "signature_warm"
  },
  {
    id: "associate_warm",
    label: "Nurturing — soft / feminine",
    description:
      "Gentle, caring hypnotic guide — soft cadence for rest, healing, and bedtime acceptance.",
    presentation: "feminine",
    toneFamily: "nurturing"
  },
  {
    id: "associate_clear",
    label: "Professional — calm guide",
    description:
      "Clear but unhurried professional hypnotic tone — steady trust without brightness or urgency.",
    presentation: "neutral",
    toneFamily: "professional"
  },
  {
    id: "associate_deep",
    label: "Deeper resonant — masculine",
    description:
      "Lower, resonant hypnotic tone — peaceful depth for sleep deepening and subconscious work.",
    presentation: "masculine",
    toneFamily: "deep_resonant"
  }
] as const;

export type LgdProfessionalVoiceId = (typeof LGD_PROFESSIONAL_VOICES)[number]["id"];

/** Shared premise shown wherever members pick a CGMR voice. */
export const LGD_VOICE_SELECTION_LEAD =
  "Your CGMR voice must first sound hypnotic: slow, smooth, and peaceful enough to help you relax into sleep so the subconscious can accept the programming. Then choose the color that fits you — nurturing, professional calm, or deeper resonant (or Terry’s signature voice).";

export const LGD_FREQUENCY_BEDS = [
  {
    id: "calm_delta",
    label: "Calm / sleep deepen",
    intent: "Restorative overnight listening",
    /** Place file at public/audio/beds/calm_delta.mp3 (ducked under voice in production). */
    audioPath: "/audio/beds/calm_delta.wav"
  },
  {
    id: "heart_coherence",
    label: "Heart / emotional openness",
    intent: "Soft rhythmic support",
    audioPath: "/audio/beds/heart_coherence.wav"
  },
  {
    id: "focus_clarity",
    label: "Focus / clarity",
    intent: "Mental clarity under voice",
    audioPath: "/audio/beds/focus_clarity.wav"
  },
  {
    id: "abundance_warm",
    label: "Abundance / confidence",
    intent: "Warm harmonic bed",
    audioPath: "/audio/beds/abundance_warm.wav"
  },
  {
    id: "neutral_music",
    label: "Classic Success Center music",
    intent: "Familiar CGMR bed",
    audioPath: "/audio/beds/neutral_music.wav"
  },
  {
    id: "choose_for_me",
    label: "Choose for me",
    intent: "Matched from primary life area",
    audioPath: ""
  }
] as const;

export function frequencyBedAudioPath(bedId: string | null | undefined): string | null {
  const bed = LGD_FREQUENCY_BEDS.find((b) => b.id === bedId);
  return bed?.audioPath || null;
}

export type LgdFrequencyBedId = (typeof LGD_FREQUENCY_BEDS)[number]["id"];

export const LGD_SCRIPT_BLOCKS = [
  "induction",
  "deepener",
  "present_bridge",
  "identity_suggestions",
  "support_suggestions",
  "mission_financial",
  "future_pacing",
  "post_hypnotic_sleep",
  "close"
] as const;

export type LgdScriptBlockId = (typeof LGD_SCRIPT_BLOCKS)[number];

/** Facilitator toggles — active/inactive in Facilitator console. */
export const LGD_FACILITATOR_FEATURE_FLAGS = [
  {
    key: "lgdElectronicIntake",
    label: "Electronic Life Guidance Discovery intake",
    defaultOn: true
  },
  {
    key: "lgdScriptDraft",
    label: "Auto Goal Manifestation script draft",
    defaultOn: true
  },
  {
    key: "lgdProfessionalVoices",
    label: "Professional hypnotic voice choices",
    defaultOn: true
  },
  {
    key: "lgdMemberOwnVoice",
    label: "Member’s own voice (later)",
    defaultOn: false
  },
  {
    key: "lgdFrequencyBeds",
    label: "Frequency / vibrational sound beds",
    defaultOn: true
  },
  {
    key: "lgdPublicOffer",
    label: "Offer LGD on public website",
    defaultOn: true
  },
  {
    key: "lgdMemberConsoleOffer",
    label: "Offer paid LGD in member console if none yet",
    defaultOn: true
  },
  {
    key: "lgdRequireFacilitatorApproval",
    label: "Require facilitator approval before production",
    defaultOn: true
  }
] as const;

export type LgdFacilitatorFeatureKey =
  (typeof LGD_FACILITATOR_FEATURE_FLAGS)[number]["key"];

export type LgdFacilitatorFeatureFlags = Record<LgdFacilitatorFeatureKey, boolean>;

export function defaultLgdFacilitatorFeatureFlags(): LgdFacilitatorFeatureFlags {
  return LGD_FACILITATOR_FEATURE_FLAGS.reduce((acc, flag) => {
    acc[flag.key] = flag.defaultOn;
    return acc;
  }, {} as LgdFacilitatorFeatureFlags);
}

/**
 * Personal & clinical information (paper `Client_Intake_Form_fillable.pdf`, pages 2–4).
 * Stored separately from the RFTS-specific CGMR/goal fields below.
 */
export type LgdChildInfo = {
  name: string;
  age: string;
  sex: string;
};

export const LGD_HOW_HEARD_OPTIONS = [
  { id: "publications", label: "Publications", specifyLabel: "Which one?" },
  { id: "radio_tv", label: "Radio / TV", specifyLabel: "Which stations?" },
  { id: "lecture", label: "Lecture", specifyLabel: "Business / organization name?" },
  { id: "personal_referral", label: "Personal referral", specifyLabel: "Who?" },
  { id: "trade_show", label: "Trade show", specifyLabel: "Which one?" },
  { id: "convention", label: "Convention", specifyLabel: "Which one?" },
  { id: "internet", label: "Internet" },
  { id: "other", label: "Other", specifyLabel: "Please specify" }
] as const;

export type LgdHowHeardId = (typeof LGD_HOW_HEARD_OPTIONS)[number]["id"];

const HOW_HEARD_IDS = new Set(LGD_HOW_HEARD_OPTIONS.map((o) => o.id));

export type LgdIntakeClientInfo = {
  legalName: string;
  sex: string;
  age: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  birthDate: string;
  homePhone: string;
  homePhoneHours: string;
  workPhone: string;
  workPhoneHours: string;
  cellPhone: string;
  email: string;
  employedBy: string;
  employerPhone: string;
  employerAddress: string;
  employerCity: string;
  employerState: string;
  employerZip: string;
  maritalStatus: string;
  spouseName: string;
  anniversaryDate: string;
  spouseEmployedBy: string;
  children: LgdChildInfo[];
  educationDegrees: string;
  occupation: string;
  doctorName: string;
  doctorPhone: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  emergencyContactAddress: string;
  priorHypnosisExperiences: string;
  religionRaised: string;
  religionNow: string;
  religionAttendServices: string;
  currentHealthIssues: string;
  currentMedications: string;
  specialInterestsHobbies: string;
  howHeard: LgdHowHeardId[];
  howHeardSpecify: Partial<Record<LgdHowHeardId, string>>;
  associatedWithSpeakerOrg: boolean;
  associatedWithSpeakerOrgSpecify: string;
  /** “I am applying for hypnosis session… missed appointments fully chargeable…” */
  hypnosisAgreementAccepted: boolean;
  hypnosisAgreementDate: string;
};

export function emptyLgdIntakeClientInfo(): LgdIntakeClientInfo {
  return {
    legalName: "",
    sex: "",
    age: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    birthDate: "",
    homePhone: "",
    homePhoneHours: "",
    workPhone: "",
    workPhoneHours: "",
    cellPhone: "",
    email: "",
    employedBy: "",
    employerPhone: "",
    employerAddress: "",
    employerCity: "",
    employerState: "",
    employerZip: "",
    maritalStatus: "",
    spouseName: "",
    anniversaryDate: "",
    spouseEmployedBy: "",
    children: [],
    educationDegrees: "",
    occupation: "",
    doctorName: "",
    doctorPhone: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    emergencyContactAddress: "",
    priorHypnosisExperiences: "",
    religionRaised: "",
    religionNow: "",
    religionAttendServices: "",
    currentHealthIssues: "",
    currentMedications: "",
    specialInterestsHobbies: "",
    howHeard: [],
    howHeardSpecify: {},
    associatedWithSpeakerOrg: false,
    associatedWithSpeakerOrgSpecify: "",
    hypnosisAgreementAccepted: false,
    hypnosisAgreementDate: ""
  };
}

function clampText(value: unknown, max = 200): string {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeLgdChildren(raw: unknown): LgdChildInfo[] {
  if (!Array.isArray(raw)) return [];
  const out: LgdChildInfo[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Partial<LgdChildInfo>;
    const name = clampText(o.name, 80);
    const age = clampText(o.age, 10);
    const sex = clampText(o.sex, 20);
    if (!name && !age && !sex) continue;
    out.push({ name, age, sex });
    if (out.length >= 8) break;
  }
  return out;
}

function normalizeLgdHowHeard(raw: unknown): LgdHowHeardId[] {
  if (!Array.isArray(raw)) return [];
  const ids: LgdHowHeardId[] = [];
  for (const item of raw) {
    const id = String(item ?? "").trim();
    if (HOW_HEARD_IDS.has(id as LgdHowHeardId) && !ids.includes(id as LgdHowHeardId)) {
      ids.push(id as LgdHowHeardId);
    }
  }
  return ids.slice(0, LGD_HOW_HEARD_OPTIONS.length);
}

/** Merge stored JSON into a full clientInfo object. */
export function normalizeLgdClientInfo(raw: unknown): LgdIntakeClientInfo {
  const base = emptyLgdIntakeClientInfo();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<LgdIntakeClientInfo> & { howHeardSpecify?: Record<string, unknown> };
  const howHeard = normalizeLgdHowHeard(o.howHeard);
  const howHeardSpecify: Partial<Record<LgdHowHeardId, string>> = {};
  if (o.howHeardSpecify && typeof o.howHeardSpecify === "object") {
    for (const id of howHeard) {
      const v = clampText((o.howHeardSpecify as Record<string, unknown>)[id], 200);
      if (v) howHeardSpecify[id] = v;
    }
  }
  return {
    legalName: clampText(o.legalName, 120),
    sex: clampText(o.sex, 30),
    age: clampText(o.age, 10),
    address: clampText(o.address, 200),
    city: clampText(o.city, 80),
    state: clampText(o.state, 40),
    zip: clampText(o.zip, 20),
    birthDate: clampText(o.birthDate, 20),
    homePhone: clampText(o.homePhone, 40),
    homePhoneHours: clampText(o.homePhoneHours, 60),
    workPhone: clampText(o.workPhone, 40),
    workPhoneHours: clampText(o.workPhoneHours, 60),
    cellPhone: clampText(o.cellPhone, 40),
    email: clampText(o.email, 160),
    employedBy: clampText(o.employedBy, 120),
    employerPhone: clampText(o.employerPhone, 40),
    employerAddress: clampText(o.employerAddress, 200),
    employerCity: clampText(o.employerCity, 80),
    employerState: clampText(o.employerState, 40),
    employerZip: clampText(o.employerZip, 20),
    maritalStatus: clampText(o.maritalStatus, 40),
    spouseName: clampText(o.spouseName, 120),
    anniversaryDate: clampText(o.anniversaryDate, 20),
    spouseEmployedBy: clampText(o.spouseEmployedBy, 120),
    children: normalizeLgdChildren(o.children),
    educationDegrees: clampText(o.educationDegrees, 300),
    occupation: clampText(o.occupation, 120),
    doctorName: clampText(o.doctorName, 120),
    doctorPhone: clampText(o.doctorPhone, 40),
    emergencyContactName: clampText(o.emergencyContactName, 120),
    emergencyContactRelationship: clampText(o.emergencyContactRelationship, 80),
    emergencyContactPhone: clampText(o.emergencyContactPhone, 40),
    emergencyContactAddress: clampText(o.emergencyContactAddress, 200),
    priorHypnosisExperiences: clampText(o.priorHypnosisExperiences, 1000),
    religionRaised: clampText(o.religionRaised, 80),
    religionNow: clampText(o.religionNow, 80),
    religionAttendServices: clampText(o.religionAttendServices, 80),
    currentHealthIssues: clampText(o.currentHealthIssues, 1000),
    currentMedications: clampText(o.currentMedications, 1000),
    specialInterestsHobbies: clampText(o.specialInterestsHobbies, 500),
    howHeard,
    howHeardSpecify,
    associatedWithSpeakerOrg: !!o.associatedWithSpeakerOrg,
    associatedWithSpeakerOrgSpecify: clampText(o.associatedWithSpeakerOrgSpecify, 300),
    hypnosisAgreementAccepted: !!o.hypnosisAgreementAccepted,
    hypnosisAgreementDate: clampText(o.hypnosisAgreementDate, 20)
  };
}

/** Facilitator-brief / production-packet lines for the personal & clinical summary (omit empty). */
export function formatLgdClientInfoSummary(
  info: LgdIntakeClientInfo
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: string | undefined | null) => {
    const v = (value || "").trim();
    if (v) rows.push({ label, value: v });
  };
  push("Name", info.legalName);
  push("Sex / Age", [info.sex, info.age].filter(Boolean).join(" / "));
  push("Birth date", info.birthDate);
  push(
    "Address",
    [info.address, [info.city, info.state, info.zip].filter(Boolean).join(", ")]
      .filter(Boolean)
      .join(" — ")
  );
  push(
    "Home phone",
    [info.homePhone, info.homePhoneHours && `(${info.homePhoneHours})`].filter(Boolean).join(" ")
  );
  push(
    "Work phone",
    [info.workPhone, info.workPhoneHours && `(${info.workPhoneHours})`].filter(Boolean).join(" ")
  );
  push("Cell phone", info.cellPhone);
  push("Email", info.email);
  push("Employed by", info.employedBy);
  push(
    "Employer contact",
    [info.employerPhone, info.employerAddress].filter(Boolean).join(" — ")
  );
  push("Marital status", info.maritalStatus);
  push(
    "Spouse",
    [info.spouseName, info.spouseEmployedBy && `employed by ${info.spouseEmployedBy}`]
      .filter(Boolean)
      .join(" — ")
  );
  push("Anniversary", info.anniversaryDate);
  if (info.children.length) {
    push(
      "Children",
      info.children.map((c) => [c.name, c.age, c.sex].filter(Boolean).join("/")).join("; ")
    );
  }
  push("Education & degrees", info.educationDegrees);
  push("Occupation", info.occupation);
  push("Doctor", [info.doctorName, info.doctorPhone].filter(Boolean).join(" — "));
  push(
    "Emergency contact",
    [
      info.emergencyContactName,
      info.emergencyContactRelationship,
      info.emergencyContactPhone,
      info.emergencyContactAddress
    ]
      .filter(Boolean)
      .join(" — ")
  );
  push("Prior hypnosis experiences", info.priorHypnosisExperiences);
  push(
    "Religion",
    [
      info.religionRaised && `raised ${info.religionRaised}`,
      info.religionNow && `now ${info.religionNow}`,
      info.religionAttendServices && `attends services: ${info.religionAttendServices}`
    ]
      .filter(Boolean)
      .join(" — ")
  );
  push("Current health issues", info.currentHealthIssues);
  push("Current medications", info.currentMedications);
  push("Special interests / hobbies", info.specialInterestsHobbies);
  if (info.howHeard.length) {
    const parts = info.howHeard.map((id) => {
      const opt = LGD_HOW_HEARD_OPTIONS.find((o) => o.id === id);
      const specify = info.howHeardSpecify[id];
      return specify ? `${opt?.label ?? id} (${specify})` : opt?.label ?? id;
    });
    push("How they heard about us", parts.join("; "));
  }
  if (info.associatedWithSpeakerOrg) {
    push("Speaker / seminar organization", info.associatedWithSpeakerOrgSpecify || "Yes");
  }
  push(
    "Hypnosis session agreement",
    info.hypnosisAgreementAccepted
      ? `Accepted${info.hypnosisAgreementDate ? ` (${info.hypnosisAgreementDate})` : ""}`
      : ""
  );
  return rows;
}

export type LgdIntakeAnswers = {
  version: typeof LGD_INTAKE_VERSION;
  consentStored: boolean;
  crisisFlag?: boolean;
  /** Member already completed a live LGD (not only electronic). */
  alreadyHadLiveLgd?: boolean;
  /** Permission for facilitator to edit the auto script draft. */
  permissionToEditDraft?: boolean;
  /** Consent for Phase B own-voice recording / clone when offered. */
  ownVoiceConsent?: boolean;
  /** Personal & clinical information — paper form pages 2–4. */
  clientInfo: LgdIntakeClientInfo;
  /** Multi-select: how they want the subconscious programmed. */
  subconsciousPrograms: LgdSubconsciousProgramId[];
  lifeAreaScores: Partial<Record<LgdLifeAreaId, number>>;
  /** Structured limiting → growth belief pairs (preferred). */
  beliefTransformations: LgdBeliefTransformation[];
  /** Legacy free-text limiting phrases; synced from beliefTransformations when present. */
  occupyingBeliefs: string[];
  gratitude: string[];
  /** Checked items from the full Challenges Checklist (paper form page 5). */
  challengeIds: LgdChallengeId[];
  /** Priority order of challenges (1 = highest); subset of challengeIds, max 10. */
  challengePriority: LgdChallengeId[];
  /** Free-text detail subfields for checked challenges that have them (which drug, weight/height, etc.). */
  challengeDetails: Partial<Record<LgdChallengeId, Record<string, string>>>;
  primaryStruggle: string;
  /** Success Center intake: short-term goals (free text). */
  shortTermGoals: string;
  /** Success Center intake: long-term goals (free text). */
  longTermGoals: string;
  /** How life should have changed in one year. */
  oneYearChange: string;
  /** How life should have changed in five years. */
  fiveYearChange: string;
  /** Ultimate goal in life. */
  ultimateGoal: string;
  topOutcomes: string[];
  goalIds: string[];
  identityStatements: string[];
  timeline: "90_days" | "12_months" | "ongoing" | "";
  incomeCurrentBand?: string;
  incomeDesiredBand?: string;
  blocks: string[];
  pastAttempts: string;
  strengths: string[];
  /**
   * Seven Keys order — Bronze is always first; remaining Keys the member wants, ranked.
   * Keys left blank on paper are simply omitted after Bronze.
   */
  sevenKeysOrder: LgdSevenKeyId[];
  willToLearn: number | null;
  beliefCanLearn: number | null;
  metaphors: string[];
  wordsLove: string[];
  wordsAvoid: string[];
  spiritualLanguage: "yes" | "minimal" | "none" | "";
  listenContext: "sleep" | "sleep_and_day" | "";
  voiceId: LgdProfessionalVoiceId | "member_own" | "";
  frequencyBedId: LgdFrequencyBedId | "";
  questionsForFacilitator: string;
  /** Member wants live Life Guidance / private sessions with a facilitator. */
  wantsLiveLgdSessions: boolean;
};

/** Member-facing CGMR listening guidance (Success Center / Terry Brussel-Rogers). */
export const LGD_CGMR_USAGE = {
  title: "How to use your Customized Goal Manifestation Recording (CGMR)",
  lead:
    "Your CGMR is the overview of your goals — mental, physical, emotional, spiritual, and financial — so they settle into the subconscious on a continuing basis. Other hypnotic recordings implement those suggestions with specific skills and habits.",
  bullets: [
    "Best as reinforcement for private sessions when you have them — and powerful on its own with night listening.",
    "Use your CGMR at least three or four nights a week.",
    "Alternate with supporting library / program recordings: CGMR suggests; specific tracks implement (e.g. memory, vision, sales, health).",
    "If you wake at night, you may switch to a different recording. If you sleep through, play CGMR and supporting tracks on different nights — or spaced MP3s, no more than three per night.",
    "Schedule placement on Reach For The Stars: 2 plays/night → CGMR as 2nd play every other night; 1 play/night → every 4th play (when your CGMR is in rotation).",
    "Plan an annual Life Guidance Renewal to update goals and your CGMR as life changes."
  ],
  contactNote:
    "For personal assistance selecting supporting materials or booking sessions, call 800-GOAL-NOW (800-462-5669)."
} as const;

export function emptyLgdIntakeAnswers(): LgdIntakeAnswers {
  return {
    version: LGD_INTAKE_VERSION,
    consentStored: false,
    alreadyHadLiveLgd: false,
    permissionToEditDraft: true,
    ownVoiceConsent: false,
    clientInfo: emptyLgdIntakeClientInfo(),
    subconsciousPrograms: [],
    lifeAreaScores: {},
    beliefTransformations: [],
    occupyingBeliefs: [],
    gratitude: [],
    challengeIds: [],
    challengePriority: [],
    challengeDetails: {},
    primaryStruggle: "",
    shortTermGoals: "",
    longTermGoals: "",
    oneYearChange: "",
    fiveYearChange: "",
    ultimateGoal: "",
    topOutcomes: [],
    goalIds: [],
    identityStatements: [],
    timeline: "",
    blocks: [],
    pastAttempts: "",
    strengths: [],
    sevenKeysOrder: ["bronze"],
    willToLearn: null,
    beliefCanLearn: null,
    metaphors: [],
    wordsLove: [],
    wordsAvoid: [],
    spiritualLanguage: "",
    listenContext: "",
    voiceId: "",
    frequencyBedId: "choose_for_me",
    questionsForFacilitator: "",
    wantsLiveLgdSessions: false
  };
}

function asStringArray(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, max);
}

const PROGRAM_IDS = new Set(LGD_SUBCONSCIOUS_PROGRAMS.map((p) => p.id));
const LIMITING_IDS = new Set(LGD_LIMITING_BELIEF_CHOICES.map((b) => b.id));
const GROWTH_IDS = new Set(LGD_GROWTH_BELIEF_CHOICES.map((b) => b.id));

export function growthBeliefLabel(id: string): string {
  return LGD_GROWTH_BELIEF_CHOICES.find((b) => b.id === id)?.label ?? "";
}

export function limitingBeliefLabel(id: string): string {
  return LGD_LIMITING_BELIEF_CHOICES.find((b) => b.id === id)?.label ?? "";
}

export function defaultGrowthForLimiting(
  limitingId: LgdLimitingBeliefId | "custom"
): { growthId: LgdGrowthBeliefId; growthText: string } {
  if (limitingId === "custom") {
    return { growthId: "thrive_expand", growthText: growthBeliefLabel("thrive_expand") };
  }
  const choice = LGD_LIMITING_BELIEF_CHOICES.find((b) => b.id === limitingId);
  const growthId = (choice?.defaultGrowthId ?? "thrive_expand") as LgdGrowthBeliefId;
  return { growthId, growthText: growthBeliefLabel(growthId) };
}

function normalizeBeliefTransformations(raw: unknown): LgdBeliefTransformation[] {
  if (!Array.isArray(raw)) return [];
  const out: LgdBeliefTransformation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Partial<LgdBeliefTransformation>;
    const limitingIdRaw = String(o.limitingId ?? "custom").trim();
    const limitingId = (
      LIMITING_IDS.has(limitingIdRaw as LgdLimitingBeliefId) ? limitingIdRaw : "custom"
    ) as LgdLimitingBeliefId | "custom";
    const growthIdRaw = String(o.growthId ?? "custom").trim();
    const growthId = (
      GROWTH_IDS.has(growthIdRaw as LgdGrowthBeliefId) ? growthIdRaw : "custom"
    ) as LgdGrowthBeliefId | "custom";
    const limitingText =
      String(o.limitingText ?? "").trim() ||
      (limitingId !== "custom" ? limitingBeliefLabel(limitingId) : "");
    let growthText = String(o.growthText ?? "").trim();
    if (!growthText && growthId !== "custom") {
      growthText = growthBeliefLabel(growthId);
    }
    if (!limitingText && !growthText) continue;
    out.push({
      limitingId,
      limitingText,
      growthId,
      growthText
    });
    if (out.length >= 6) break;
  }
  return out;
}

function normalizeSubconsciousPrograms(raw: unknown): LgdSubconsciousProgramId[] {
  if (!Array.isArray(raw)) return [];
  const ids: LgdSubconsciousProgramId[] = [];
  for (const item of raw) {
    const id = String(item ?? "").trim();
    if (PROGRAM_IDS.has(id as LgdSubconsciousProgramId)) {
      ids.push(id as LgdSubconsciousProgramId);
    }
  }
  return [...new Set(ids)].slice(0, 8);
}

function normalizeChallengeIds(raw: unknown): LgdChallengeId[] {
  if (!Array.isArray(raw)) return [];
  const ids: LgdChallengeId[] = [];
  for (const item of raw) {
    const id = resolveChallengeId(String(item ?? "").trim());
    if (CHALLENGE_IDS.has(id as LgdChallengeId)) {
      ids.push(id as LgdChallengeId);
    }
  }
  return [...new Set(ids)].slice(0, LGD_CHALLENGES.length);
}

function normalizeChallengePriority(
  raw: unknown,
  selected: LgdChallengeId[]
): LgdChallengeId[] {
  const selectedSet = new Set(selected);
  if (!Array.isArray(raw)) return [];
  const ids: LgdChallengeId[] = [];
  for (const item of raw) {
    const id = resolveChallengeId(String(item ?? "").trim()) as LgdChallengeId;
    if (!selectedSet.has(id) || !CHALLENGE_IDS.has(id)) continue;
    if (ids.includes(id)) continue;
    ids.push(id);
    if (ids.length >= 10) break;
  }
  return ids;
}

/** Free-text detail subfields for checked challenges (which drug, weight/height, income bands, etc.). */
function normalizeChallengeDetails(
  raw: unknown,
  selected: LgdChallengeId[]
): Partial<Record<LgdChallengeId, Record<string, string>>> {
  const out: Partial<Record<LgdChallengeId, Record<string, string>>> = {};
  if (!raw || typeof raw !== "object") return out;
  const selectedSet = new Set(selected);
  for (const [rawKey, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = resolveChallengeId(rawKey.trim()) as LgdChallengeId;
    if (!selectedSet.has(id) || !value || typeof value !== "object") continue;
    const detailFields = lgdChallengeDetailFields(id);
    if (!detailFields.length) continue;
    const allowedFieldIds = new Set(detailFields.map((f) => f.id));
    const fields: Record<string, string> = {};
    for (const [fieldId, fieldValue] of Object.entries(value as Record<string, unknown>)) {
      if (!allowedFieldIds.has(fieldId)) continue;
      const text = clampText(fieldValue, 200);
      if (text) fields[fieldId] = text;
    }
    if (Object.keys(fields).length) out[id] = fields;
  }
  return out;
}

/** Merge stored JSON into a full answers object. */
export function normalizeLgdIntakeAnswers(raw: unknown): LgdIntakeAnswers {
  const base = emptyLgdIntakeAnswers();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<LgdIntakeAnswers> & { lifeAreaScores?: Record<string, number> };
  const scores: Partial<Record<LgdLifeAreaId, number>> = {};
  for (const area of LGD_LIFE_AREAS) {
    const n = o.lifeAreaScores?.[area.id];
    if (typeof n === "number" && n >= 1 && n <= 10) scores[area.id] = n;
  }
  let beliefTransformations = normalizeBeliefTransformations(o.beliefTransformations);
  const legacyOccupying = asStringArray(o.occupyingBeliefs, 5);
  // Backfill pairs from older free-text occupying beliefs.
  if (!beliefTransformations.length && legacyOccupying.length) {
    beliefTransformations = legacyOccupying.map((limitingText) => ({
      limitingId: "custom" as const,
      limitingText,
      growthId: "thrive_expand" as const,
      growthText: growthBeliefLabel("thrive_expand")
    }));
  }
  const occupyingBeliefs = beliefTransformations.length
    ? beliefTransformations.map((p) => p.limitingText).filter(Boolean).slice(0, 5)
    : legacyOccupying;
  const challengeIds = normalizeChallengeIds(o.challengeIds);
  const challengePriority = normalizeChallengePriority(o.challengePriority, challengeIds);
  const challengeDetails = normalizeChallengeDetails(o.challengeDetails, challengeIds);

  return {
    version: LGD_INTAKE_VERSION,
    consentStored: !!o.consentStored,
    crisisFlag: !!o.crisisFlag,
    alreadyHadLiveLgd: !!o.alreadyHadLiveLgd,
    permissionToEditDraft: o.permissionToEditDraft !== false,
    ownVoiceConsent: !!o.ownVoiceConsent,
    clientInfo: normalizeLgdClientInfo(o.clientInfo),
    subconsciousPrograms: normalizeSubconsciousPrograms(o.subconsciousPrograms),
    lifeAreaScores: scores,
    beliefTransformations,
    occupyingBeliefs,
    gratitude: asStringArray(o.gratitude, 5),
    challengeIds,
    challengePriority,
    challengeDetails,
    primaryStruggle: String(o.primaryStruggle ?? "").trim(),
    shortTermGoals: String(o.shortTermGoals ?? "").trim(),
    longTermGoals: String(o.longTermGoals ?? "").trim(),
    oneYearChange: String(o.oneYearChange ?? "").trim(),
    fiveYearChange: String(o.fiveYearChange ?? "").trim(),
    ultimateGoal: String(o.ultimateGoal ?? "").trim(),
    topOutcomes: asStringArray(o.topOutcomes, 3),
    goalIds: asStringArray(o.goalIds, 10),
    identityStatements: asStringArray(o.identityStatements, 7),
    timeline:
      o.timeline === "90_days" || o.timeline === "12_months" || o.timeline === "ongoing"
        ? o.timeline
        : "",
    incomeCurrentBand: String(o.incomeCurrentBand ?? "").trim() || undefined,
    incomeDesiredBand: String(o.incomeDesiredBand ?? "").trim() || undefined,
    blocks: asStringArray(o.blocks, 10),
    pastAttempts: String(o.pastAttempts ?? "").trim(),
    strengths: asStringArray(o.strengths, 10),
    sevenKeysOrder: normalizeSevenKeysOrder(o.sevenKeysOrder),
    willToLearn:
      typeof o.willToLearn === "number" && o.willToLearn >= 1 && o.willToLearn <= 5
        ? o.willToLearn
        : null,
    beliefCanLearn:
      typeof o.beliefCanLearn === "number" && o.beliefCanLearn >= 1 && o.beliefCanLearn <= 5
        ? o.beliefCanLearn
        : null,
    metaphors: asStringArray(o.metaphors, 10),
    wordsLove: asStringArray(o.wordsLove, 20),
    wordsAvoid: asStringArray(o.wordsAvoid, 20),
    spiritualLanguage:
      o.spiritualLanguage === "yes" ||
      o.spiritualLanguage === "minimal" ||
      o.spiritualLanguage === "none"
        ? o.spiritualLanguage
        : "",
    listenContext:
      o.listenContext === "sleep" || o.listenContext === "sleep_and_day"
        ? o.listenContext
        : "",
    voiceId: (String(o.voiceId ?? "").trim() || "") as LgdIntakeAnswers["voiceId"],
    frequencyBedId: (String(o.frequencyBedId ?? "").trim() ||
      "choose_for_me") as LgdFrequencyBedId | "",
    questionsForFacilitator: String(o.questionsForFacilitator ?? "").trim(),
    wantsLiveLgdSessions: !!o.wantsLiveLgdSessions
  };
}

export const LGD_INTAKE_SECTIONS = [
  { id: "A", title: "Instructions & subconscious programming" },
  { id: "P", title: "Personal & clinical information" },
  { id: "B", title: "Beliefs & life areas" },
  { id: "C", title: "Challenges checklist" },
  { id: "D", title: "Goals for your CGMR" },
  { id: "E", title: "Seven Keys & how you get there" },
  { id: "F", title: "Language, modality & facilitator handoff" }
] as const;

/** Pick a concrete frequency bed when member chose “choose for me”. */
export function resolveFrequencyBedId(
  answers: LgdIntakeAnswers
): Exclude<LgdFrequencyBedId, "choose_for_me"> {
  const selected = answers.frequencyBedId;
  if (selected && selected !== "choose_for_me") {
    return selected;
  }
  if (answers.listenContext === "sleep") return "calm_delta";
  let lowest: { id: LgdLifeAreaId; score: number } | null = null;
  for (const area of LGD_LIFE_AREAS) {
    const score = answers.lifeAreaScores[area.id];
    if (typeof score !== "number") continue;
    if (!lowest || score < lowest.score) lowest = { id: area.id, score };
  }
  if (!lowest) return "neutral_music";
  switch (lowest.id) {
    case "sleep_energy":
    case "physical":
      return "calm_delta";
    case "emotional":
    case "relationship":
      return "heart_coherence";
    case "mental":
    case "work_mission":
      return "focus_clarity";
    case "financial":
      return "abundance_warm";
    case "spiritual":
      return "heart_coherence";
    default:
      return "neutral_music";
  }
}

export function findLgdContradictionNotes(answers: LgdIntakeAnswers): string[] {
  const notes: string[] = [];
  if (
    answers.spiritualLanguage === "none" &&
    (answers.incomeDesiredBand?.trim() || (answers.lifeAreaScores.financial ?? 0) <= 4)
  ) {
    notes.push(
      "Spiritual language set to none while financial growth is in focus — keep mission framing practical, avoid faith metaphors."
    );
  }
  if (answers.crisisFlag) {
    notes.push("Crisis flag set — do not produce automated script; escalate to human care.");
  }
  if (answers.challengeIds.includes("thought_about_suicide") && !answers.crisisFlag) {
    notes.push(
      "Member checked “Thought about suicide” on the Challenges Checklist — confirm safety and consider human follow-up before any automated script."
    );
  }
  if (
    answers.voiceId === "member_own" &&
    !answers.ownVoiceConsent
  ) {
    notes.push("Member selected own voice without consent checkbox — confirm before clone/recording.");
  }
  if ((answers.willToLearn ?? 5) <= 2 || (answers.beliefCanLearn ?? 5) <= 2) {
    notes.push("Low will-to-learn or belief-can-learn scores — add reassurance and small-step suggestions.");
  }
  if (answers.wordsAvoid.some((w) =>
    answers.identityStatements.some((id) => id.toLowerCase().includes(w.toLowerCase()))
  )) {
    notes.push("An identity statement may contain a word marked to avoid — edit before production.");
  }
  if (!answers.subconsciousPrograms.length) {
    notes.push("No subconscious programming preferences selected — confirm tone with member.");
  }
  if (!answers.beliefTransformations.some((p) => p.limitingText && p.growthText)) {
    notes.push("No belief transformation pairs — script may lack clear release → install reframes.");
  }
  return notes;
}

export type LgdScriptDraftBlocks = Record<LgdScriptBlockId, string[]>;

export function buildLgdScriptDraftBlocks(input: {
  firstName: string;
  answers: LgdIntakeAnswers;
  goalNames?: string[];
  resolvedBedId?: string;
}): LgdScriptDraftBlocks {
  const name = (input.firstName || "friend").trim() || "friend";
  const a = input.answers;
  const identities = a.identityStatements.map((s) => s.trim()).filter(Boolean);
  const outcomes = a.topOutcomes.map((s) => s.trim()).filter(Boolean);
  const pairs = a.beliefTransformations.filter(
    (p) => p.limitingText.trim() || p.growthText.trim()
  );
  const strengths = a.strengths.map((s) => s.trim()).filter(Boolean);
  const gratitude = a.gratitude.map((s) => s.trim()).filter(Boolean);
  const metaphors = a.metaphors.map((s) => s.trim()).filter(Boolean);
  const wordsLove = a.wordsLove.map((s) => s.trim()).filter(Boolean);
  const wordsAvoid = a.wordsAvoid.map((s) => s.trim()).filter(Boolean);
  const goals =
    input.goalNames && input.goalNames.length ? input.goalNames : a.goalIds;
  const bed = input.resolvedBedId || resolveFrequencyBedId(a);
  const programCues = LGD_SUBCONSCIOUS_PROGRAMS.filter((p) =>
    a.subconsciousPrograms.includes(p.id)
  ).map((p) => p.scriptCue);

  const spiritualTone =
    a.spiritualLanguage === "yes"
      ? "You honor spirit and practical action together."
      : a.spiritualLanguage === "minimal"
        ? "You honor quiet meaning without needing special language."
        : "You stay with clear, practical language that fits you.";

  // Classic SC CGMR shared frame (from library CGMR transcriptions).
  const terryFrame = buildTerryCgmrInductionAndDeepener(name);
  const induction = [...terryFrame.induction];
  if (programCues.length) {
    induction.push(
      "Tonight your subconscious continues to receive programming for growth, expansion, and thriving — in the ways you chose."
    );
    induction.push(...programCues.slice(0, 4));
  }
  const deepener = [...terryFrame.deepener];
  if (metaphors.length) {
    deepener.push(
      `Images that feel especially true for you — ${metaphors.join(", ")} — can join this natural deepening.`
    );
  }

  const presentBridge: string[] = [];
  if (a.primaryStruggle.trim()) {
    presentBridge.push(
      `You acknowledge where you have been: ${a.primaryStruggle.trim()} — and you choose to move forward with clarity.`
    );
  } else {
    presentBridge.push(
      "You acknowledge where you have been, and you choose to move forward with clarity and calm."
    );
  }
  const topChallenges = prioritizedLgdChallenges(a);
  if (topChallenges.length) {
    presentBridge.push(
      "The priorities you named for growth can resolve as your subconscious cooperates with your clear goals — without rehearsing old struggle."
    );
  }
  const keysPath = orderedLgdSevenKeys(a);
  if (keysPath.length > 1) {
    const pathLabels = keysPath
      .slice(0, 4)
      .map((k) => `${k.metal} (${k.label})`)
      .join("; ");
    presentBridge.push(
      `Your growth path begins with the Bronze Key — self-hypnosis as foundation — then continues through: ${pathLabels}${
        keysPath.length > 4 ? "; and the Keys you chose beyond these" : ""
      }.`
    );
  } else if (keysPath.length === 1) {
    presentBridge.push(
      "Your foundation is the Bronze Key — auto-suggestion and self-hypnosis — the doorway to every other Key."
    );
  }
  if (pairs.length) {
    presentBridge.push(
      "Beliefs that were harmful to you can soften and release. In their place, you install beliefs that help you grow, expand, and thrive:"
    );
    for (const pair of pairs) {
      if (pair.limitingText.trim()) {
        presentBridge.push(`Releasing: “${pair.limitingText.trim()}”`);
      }
      if (pair.growthText.trim()) {
        presentBridge.push(`Installing: “${pair.growthText.trim()}”`);
      }
    }
  } else if (a.occupyingBeliefs.length) {
    presentBridge.push(
      "Old phrases that no longer define you can soften and release as you make room for new truth:"
    );
    for (const b of a.occupyingBeliefs) {
      if (b.trim()) presentBridge.push(`Releasing: “${b.trim()}”`);
    }
  }
  if (gratitude.length) {
    presentBridge.push(`You also remember what already works: ${gratitude.join("; ")}.`);
  }

  const identitySuggestions: string[] = [];
  const growthFromPairs = pairs.map((p) => p.growthText.trim()).filter(Boolean);
  const identitySource = identities.length
    ? identities
    : growthFromPairs.length
      ? growthFromPairs
      : [];
  if (identitySource.length) {
    for (const phrase of identitySource) {
      identitySuggestions.push(`You are becoming — and more and more you are — “${phrase}”`);
    }
  } else {
    identitySuggestions.push(
      "You grow into the highest expression of yourself physically, mentally, emotionally, spiritually, and financially — in your own time, with steady repetition."
    );
  }
  if (outcomes.length) {
    identitySuggestions.push("Your clear outcomes take root:");
    for (const o of outcomes) identitySuggestions.push(o);
  }
  if (goals.length) {
    identitySuggestions.push(`Your prioritized goals include: ${goals.join("; ")}.`);
  }
  if (wordsLove.length) {
    identitySuggestions.push(`Words that land for you: ${wordsLove.join(", ")}.`);
  }
  if (wordsAvoid.length) {
    identitySuggestions.push(
      `(Production note: avoid these words in the read — ${wordsAvoid.join(", ")}.)`
    );
  }

  const supportSuggestions: string[] = [];
  if (programCues.length) {
    supportSuggestions.push(
      "Your subconscious programming preferences continue to settle with each breath and each night of listening."
    );
  }
  if (strengths.length) {
    supportSuggestions.push(`You draw on what already works: ${strengths.join("; ")}.`);
  }
  if (a.blocks.length) {
    supportSuggestions.push(
      "As old outer blocks soften, you choose the next right step with calm confidence — without rehearsing the old story."
    );
  }
  if (a.pastAttempts.trim()) {
    supportSuggestions.push(
      `Past attempts taught you what to refine: ${a.pastAttempts.trim()}. You use that wisdom now.`
    );
  }
  const will = a.willToLearn ?? 3;
  const belief = a.beliefCanLearn ?? 3;
  supportSuggestions.push(
    `Your will to learn (${will}/5) and belief that you can learn (${belief}/5) grow steadier with each listening.`
  );
  supportSuggestions.push(spiritualTone);

  const missionFinancial: string[] = [];
  if (a.incomeDesiredBand?.trim() || a.lifeAreaScores.financial != null) {
    missionFinancial.push(
      "Success is allowed. You show up as a beacon — meaning and practical results together. Right action and right income can grow side by side."
    );
    if (a.incomeDesiredBand?.trim()) {
      missionFinancial.push(`You move steadily toward: ${a.incomeDesiredBand.trim()}.`);
    }
  }

  const futurePacing = [
    "In the days ahead you notice small proofs — calmer evenings, clearer choices, aligned action — and each proof deepens trust in this path."
  ];
  if (a.shortTermGoals.trim()) {
    futurePacing.push(`Near-term, you move toward: ${a.shortTermGoals.trim()}.`);
  }
  if (a.oneYearChange.trim()) {
    futurePacing.push(
      `Looking ahead one year, your life has changed in this direction: ${a.oneYearChange.trim()}.`
    );
  }
  if (a.longTermGoals.trim()) {
    futurePacing.push(`Over the longer arc, you hold: ${a.longTermGoals.trim()}.`);
  }
  if (a.ultimateGoal.trim()) {
    futurePacing.push(
      `Your ultimate direction — the North Star you keep — is: ${a.ultimateGoal.trim()}.`
    );
  }
  if (a.timeline === "90_days") {
    futurePacing.push("Over the next ninety days, progress feels tangible and repeatable.");
  } else if (a.timeline === "12_months" && !a.oneYearChange.trim()) {
    futurePacing.push("Across this year, the new pattern becomes natural.");
  } else if (a.timeline === "ongoing") {
    futurePacing.push("This is an ongoing path — each day you practice, the pattern deepens.");
  }

  const postHypnotic =
    a.listenContext === "sleep_and_day"
      ? [
          "These personalized suggestions continue to settle as you rest. By day you notice yourself choosing aligned action more easily."
        ]
      : [
          "These personalized suggestions continue to settle as you sleep and rest."
        ];

  // Classic SC CGMR close (self-mastery + emerge into natural sleep + nightly reinforcement).
  const close = [
    ...buildTerryCgmrClose(),
    // Studio/production note only — strip before final voice read if desired.
    `(Production note — not spoken: voice ${a.voiceId || "unset"} · sound bed ${bed})`
  ];

  return {
    induction,
    deepener,
    present_bridge: presentBridge,
    identity_suggestions: identitySuggestions,
    support_suggestions: supportSuggestions,
    mission_financial: missionFinancial,
    future_pacing: futurePacing,
    post_hypnotic_sleep: postHypnotic,
    close
  };
}

/**
 * Build a reviewable Markdown Goal Manifestation script draft from intake answers.
 * Preserves member phrasing; facilitator may edit before production.
 */
export function buildGoalManifestationScriptDraft(input: {
  firstName: string;
  answers: LgdIntakeAnswers;
  goalNames?: string[];
  resolvedBedId?: string;
}): string {
  const name = (input.firstName || "friend").trim() || "friend";
  const blocks = buildLgdScriptDraftBlocks(input);
  const titles: Record<LgdScriptBlockId, string> = {
    induction: "1. Induction",
    deepener: "2. Deepener",
    present_bridge: "3. Present → future bridge",
    identity_suggestions: "4. Identity & goal suggestions (member words)",
    support_suggestions: "5. Supports & strengths",
    mission_financial: "6. Mission & financial alignment",
    future_pacing: "7. Future pacing",
    post_hypnotic_sleep: "8. Post-hypnotic / sleep",
    close: "9. Close"
  };
  const lines: string[] = [
    `# Goal Manifestation Script Draft — ${name}`,
    "",
    "_Generated from Electronic Life Guidance Discovery. Review before production._",
    ""
  ];
  for (const id of LGD_SCRIPT_BLOCKS) {
    const parts = blocks[id];
    if (!parts.length) continue;
    lines.push(`## ${titles[id]}`);
    for (const p of parts) {
      if (p.startsWith("Releasing:") || (!p.includes(".") && parts.indexOf(p) > 0 && id === "identity_suggestions")) {
        lines.push(`- ${p}`);
      } else if (outcomesLine(p, input.answers)) {
        lines.push(`- ${p}`);
      } else {
        lines.push(p);
      }
    }
    lines.push("");
  }
  const notes = findLgdContradictionNotes(input.answers);
  if (notes.length) {
    lines.push("---");
    lines.push("### Facilitator review flags");
    for (const n of notes) lines.push(`- ${n}`);
    lines.push("");
  }
  return lines.join("\n");
}

function outcomesLine(p: string, answers: LgdIntakeAnswers): boolean {
  return answers.topOutcomes.some((o) => o.trim() === p.trim());
}

/** Horizon goal lines for briefs / packets (omit empty). */
export function formatLgdHorizonGoals(answers: LgdIntakeAnswers): {
  label: string;
  value: string;
}[] {
  return [
    { label: "Short-term", value: answers.shortTermGoals.trim() },
    { label: "Long-term", value: answers.longTermGoals.trim() },
    { label: "One-year change", value: answers.oneYearChange.trim() },
    { label: "Five-year change", value: answers.fiveYearChange.trim() },
    { label: "Ultimate goal", value: answers.ultimateGoal.trim() }
  ].filter((row) => row.value);
}

/** Plain-text production packet for studio / engineer handoff. */
export function buildLgdProductionPacket(input: {
  memberEmail: string;
  firstName: string | null;
  lastName: string | null;
  answers: LgdIntakeAnswers;
  scriptDraftText: string;
  status: string;
  resolvedBedId?: string;
  voiceLabel?: string;
}): string {
  const name =
    [input.firstName, input.lastName].filter(Boolean).join(" ").trim() || input.memberEmail;
  const bed = input.resolvedBedId || resolveFrequencyBedId(input.answers);
  const notes = findLgdContradictionNotes(input.answers);
  const voice =
    input.voiceLabel ||
    LGD_PROFESSIONAL_VOICES.find((v) => v.id === input.answers.voiceId)?.label ||
    input.answers.voiceId ||
    "unset";
  const bedPath = frequencyBedAudioPath(bed);
  const voiceMode =
    input.answers.voiceId === "member_own"
      ? "member_own (device recording)"
      : "ai_internal preferred; studio_external (Paul Griffin) fallback";
  return [
    "RFTS — Goal Manifestation Production Packet",
    "============================================",
    `Member: ${name}`,
    `Email: ${input.memberEmail}`,
    `Intake status: ${input.status}`,
    `Voice: ${voice}`,
    `Voice production mode: ${voiceMode}`,
    `Frequency / sound bed: ${bed}`,
    bedPath ? `Bed audio file (under voice): ${bedPath}` : "",
    "Mix note: duck bed under voice; never replace suggestions.",
    `Listen context: ${input.answers.listenContext || "unset"}`,
    `Permission to edit draft: ${input.answers.permissionToEditDraft !== false ? "yes" : "no"}`,
    `Own-voice consent: ${input.answers.ownVoiceConsent ? "yes" : "no"}`,
    `Wants live LGD / private sessions: ${input.answers.wantsLiveLgdSessions ? "yes" : "no"}`,
    "",
    (() => {
      const rows = formatLgdClientInfoSummary(input.answers.clientInfo);
      if (!rows.length) return "";
      return ["Personal & clinical summary:", ...rows.map((r) => `- ${r.label}: ${r.value}`), ""].join(
        "\n"
      );
    })(),
    (() => {
      const ranked = prioritizedLgdChallenges(input.answers);
      if (!ranked.length) return "";
      return [
        "Priority challenges (member ranking):",
        ...ranked.map((c) => {
          const details = c.details;
          const detailText =
            details && Object.keys(details).length
              ? ` — ${Object.entries(details)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")}`
              : "";
          return `${c.priority}. ${c.label} [${lgdChallengeCategoryLabel(c.category)}]${detailText}`;
        }),
        ""
      ].join("\n");
    })(),
    (() => {
      const keys = orderedLgdSevenKeys(input.answers);
      return [
        "Seven Keys order (Bronze always first):",
        ...keys.map((k) => `${k.rank}. ${k.metal} — ${k.label}`),
        ""
      ].join("\n");
    })(),
    (() => {
      const horizons = formatLgdHorizonGoals(input.answers);
      if (!horizons.length) return "";
      return [
        "Goal horizons:",
        ...horizons.map((h) => `- ${h.label}: ${h.value}`),
        ""
      ].join("\n");
    })(),
    "Schedule placement (Success Center rules):",
    "- 2 plays/night → CGMR as 2nd play every other night",
    "- 1 play/night → every 4th play",
    "",
    notes.length ? `Review flags:\n${notes.map((n) => `- ${n}`).join("\n")}\n` : "",
    "----- SCRIPT -----",
    input.scriptDraftText
  ]
    .filter(Boolean)
    .join("\n");
}
