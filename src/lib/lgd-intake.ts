/**
 * Electronic Life Guidance Discovery (LGD) — field model, script skeleton,
 * voice catalog, and facilitator feature flags.
 * Full product design: docs/LGD_ELECTRONIC_INTAKE.md
 */

export const LGD_INTAKE_VERSION = 1 as const;

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

/** Professional hypnotic voices (Phase A). Member-own-voice is Phase B. */
export const LGD_PROFESSIONAL_VOICES = [
  {
    id: "terry",
    label: "Terry Brussel-Rogers",
    description: "Signature Success Center voice — warm, authoritative, holistic."
  },
  {
    id: "associate_warm",
    label: "Associate — warm",
    description: "Gentle, nurturing tone for rest and emotional healing goals."
  },
  {
    id: "associate_clear",
    label: "Associate — clear",
    description: "Clear professional tone for focus, business, and performance goals."
  },
  {
    id: "associate_deep",
    label: "Associate — deep",
    description: "Deeper resonant tone for sleep deepening and subconscious work."
  }
] as const;

export type LgdProfessionalVoiceId = (typeof LGD_PROFESSIONAL_VOICES)[number]["id"];

export const LGD_FREQUENCY_BEDS = [
  { id: "calm_delta", label: "Calm / sleep deepen", intent: "Restorative overnight listening" },
  { id: "heart_coherence", label: "Heart / emotional openness", intent: "Soft rhythmic support" },
  { id: "focus_clarity", label: "Focus / clarity", intent: "Mental clarity under voice" },
  { id: "abundance_warm", label: "Abundance / confidence", intent: "Warm harmonic bed" },
  { id: "neutral_music", label: "Classic Success Center music", intent: "Familiar CGMR bed" },
  { id: "choose_for_me", label: "Choose for me", intent: "Matched from primary life area" }
] as const;

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

export type LgdIntakeAnswers = {
  version: typeof LGD_INTAKE_VERSION;
  consentStored: boolean;
  crisisFlag?: boolean;
  lifeAreaScores: Partial<Record<LgdLifeAreaId, number>>;
  occupyingBeliefs: string[];
  gratitude: string[];
  primaryStruggle: string;
  topOutcomes: string[];
  goalIds: string[];
  identityStatements: string[];
  timeline: "90_days" | "12_months" | "ongoing" | "";
  incomeCurrentBand?: string;
  incomeDesiredBand?: string;
  blocks: string[];
  pastAttempts: string;
  strengths: string[];
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
};

export function emptyLgdIntakeAnswers(): LgdIntakeAnswers {
  return {
    version: LGD_INTAKE_VERSION,
    consentStored: false,
    lifeAreaScores: {},
    occupyingBeliefs: [],
    gratitude: [],
    primaryStruggle: "",
    topOutcomes: [],
    goalIds: [],
    identityStatements: [],
    timeline: "",
    blocks: [],
    pastAttempts: "",
    strengths: [],
    willToLearn: null,
    beliefCanLearn: null,
    metaphors: [],
    wordsLove: [],
    wordsAvoid: [],
    spiritualLanguage: "",
    listenContext: "",
    voiceId: "",
    frequencyBedId: "choose_for_me",
    questionsForFacilitator: ""
  };
}

function asStringArray(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, max);
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
  return {
    version: LGD_INTAKE_VERSION,
    consentStored: !!o.consentStored,
    crisisFlag: !!o.crisisFlag,
    lifeAreaScores: scores,
    occupyingBeliefs: asStringArray(o.occupyingBeliefs, 5),
    gratitude: asStringArray(o.gratitude, 5),
    primaryStruggle: String(o.primaryStruggle ?? "").trim(),
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
    questionsForFacilitator: String(o.questionsForFacilitator ?? "").trim()
  };
}

export const LGD_INTAKE_SECTIONS = [
  { id: "A", title: "Orientation & consent" },
  { id: "B", title: "Where you are" },
  { id: "C", title: "Where you want to go" },
  { id: "D", title: "How you get there" },
  { id: "E", title: "Language & modality" },
  { id: "F", title: "Facilitator handoff" }
] as const;

/**
 * Build a reviewable Markdown Goal Manifestation script draft from intake answers.
 * Preserves member phrasing; facilitator may edit before production.
 */
export function buildGoalManifestationScriptDraft(input: {
  firstName: string;
  answers: LgdIntakeAnswers;
  goalNames?: string[];
}): string {
  const name = (input.firstName || "friend").trim() || "friend";
  const identities = input.answers.identityStatements.map((s) => s.trim()).filter(Boolean);
  const outcomes = input.answers.topOutcomes.map((s) => s.trim()).filter(Boolean);
  const beliefs = input.answers.occupyingBeliefs.map((s) => s.trim()).filter(Boolean);
  const strengths = input.answers.strengths.map((s) => s.trim()).filter(Boolean);
  const goals =
    input.goalNames && input.goalNames.length
      ? input.goalNames
      : input.answers.goalIds;

  const lines: string[] = [];
  lines.push(`# Goal Manifestation Script Draft — ${name}`);
  lines.push("");
  lines.push("_Generated from Electronic Life Guidance Discovery. Review before production._");
  lines.push("");
  lines.push("## 1. Induction");
  lines.push(
    `Allow yourself to settle, ${name}. With each breath, the body softens. You are safe to rest and receive.`
  );
  lines.push("");
  lines.push("## 2. Deepener");
  lines.push(
    "Deeper with each count… ten… nine… drifting… eight… seven… deeper still… six… five… four… three… two… one… deeply receptive."
  );
  lines.push("");
  lines.push("## 3. Present → future bridge");
  if (input.answers.primaryStruggle.trim()) {
    lines.push(
      `You acknowledge where you have been: ${input.answers.primaryStruggle.trim()} — and you choose to move forward with clarity.`
    );
  } else {
    lines.push(
      "You acknowledge where you have been, and you choose to move forward with clarity and calm."
    );
  }
  if (beliefs.length) {
    lines.push(
      "Old phrases that no longer define you can soften and release as you make room for new truth:"
    );
    for (const b of beliefs) lines.push(`- Releasing: “${b}”`);
  }
  lines.push("");
  lines.push("## 4. Identity & goal suggestions (member words)");
  if (identities.length) {
    for (const phrase of identities) {
      lines.push(`You are becoming — and more and more you are — “${phrase}”`);
    }
  } else {
    lines.push(
      "You grow into the highest expression of yourself physically, mentally, emotionally, spiritually, and financially — in your own time, with steady repetition."
    );
  }
  if (outcomes.length) {
    lines.push("Your clear outcomes take root:");
    for (const o of outcomes) lines.push(`- ${o}`);
  }
  if (goals.length) {
    lines.push(`Your prioritized goals include: ${goals.join("; ")}.`);
  }
  lines.push("");
  lines.push("## 5. Supports & strengths");
  if (strengths.length) {
    lines.push(`You draw on what already works: ${strengths.join("; ")}.`);
  }
  lines.push(
    "You have the will to learn and the belief that you can learn what you need to create the reality you choose."
  );
  lines.push("");
  if (
    input.answers.incomeDesiredBand?.trim() ||
    input.answers.lifeAreaScores.financial != null
  ) {
    lines.push("## 6. Mission & financial alignment");
    lines.push(
      "Success is allowed. You show up as a beacon — spirit and practical results together. Right action and right income can grow side by side."
    );
    if (input.answers.incomeDesiredBand?.trim()) {
      lines.push(
        `You move steadily toward: ${input.answers.incomeDesiredBand.trim()}.`
      );
    }
    lines.push("");
  }
  lines.push("## 7. Future pacing");
  lines.push(
    "In the days ahead you notice small proofs — calmer evenings, clearer choices, aligned action — and each proof deepens trust in this path."
  );
  lines.push("");
  lines.push("## 8. Post-hypnotic / sleep");
  lines.push(
    "As you sleep, these suggestions continue to settle. You wake when it is time, refreshed, or you sleep through the night as your body prefers."
  );
  lines.push("");
  lines.push("## 9. Close");
  lines.push(
    "Rest now. You are supported. These words work with you while you sleep."
  );
  lines.push("");
  lines.push("---");
  lines.push(
    `Voice preference: ${input.answers.voiceId || "unset"} · Bed: ${input.answers.frequencyBedId || "unset"}`
  );
  return lines.join("\n");
}
