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
  /** Member already completed a live LGD (not only electronic). */
  alreadyHadLiveLgd?: boolean;
  /** Permission for facilitator to edit the auto script draft. */
  permissionToEditDraft?: boolean;
  /** Consent for Phase B own-voice recording / clone when offered. */
  ownVoiceConsent?: boolean;
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
    alreadyHadLiveLgd: false,
    permissionToEditDraft: true,
    ownVoiceConsent: false,
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
    alreadyHadLiveLgd: !!o.alreadyHadLiveLgd,
    permissionToEditDraft: o.permissionToEditDraft !== false,
    ownVoiceConsent: !!o.ownVoiceConsent,
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

/** Pick a concrete frequency bed when member chose “choose for me”. */
export function resolveFrequencyBedId(
  answers: LgdIntakeAnswers
): Exclude<LgdFrequencyBedId, "choose_for_me"> {
  const selected = answers.frequencyBedId;
  if (selected && selected !== "choose_for_me" && selected !== "") {
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
  const beliefs = a.occupyingBeliefs.map((s) => s.trim()).filter(Boolean);
  const strengths = a.strengths.map((s) => s.trim()).filter(Boolean);
  const gratitude = a.gratitude.map((s) => s.trim()).filter(Boolean);
  const metaphors = a.metaphors.map((s) => s.trim()).filter(Boolean);
  const wordsLove = a.wordsLove.map((s) => s.trim()).filter(Boolean);
  const wordsAvoid = a.wordsAvoid.map((s) => s.trim()).filter(Boolean);
  const goals =
    input.goalNames && input.goalNames.length ? input.goalNames : a.goalIds;
  const bed = input.resolvedBedId || resolveFrequencyBedId(a);

  const metaphorLine = metaphors.length
    ? `Images that feel true for you — ${metaphors.join(", ")} — support this deepening.`
    : "Allow images that feel natural for you to support this deepening.";

  const deepener =
    a.listenContext === "sleep"
      ? [
          "Deeper with each breath as sleep arrives… ten… nine… drifting… eight… seven… the body heavy and safe… six… five… four… three… two… one… deeply receptive while you rest."
        ]
      : [
          "Deeper with each count… ten… nine… drifting… eight… seven… deeper still… six… five… four… three… two… one… deeply receptive.",
          metaphorLine
        ];

  const spiritualTone =
    a.spiritualLanguage === "yes"
      ? "You honor spirit and practical action together."
      : a.spiritualLanguage === "minimal"
        ? "You honor quiet meaning without needing special language."
        : "You stay with clear, practical language that fits you.";

  const induction = [
    `Allow yourself to settle, ${name}. With each breath, the body softens. You are safe to rest and receive.`,
    metaphorLine
  ];

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
  if (beliefs.length) {
    presentBridge.push(
      "Old phrases that no longer define you can soften and release as you make room for new truth:"
    );
    for (const b of beliefs) presentBridge.push(`Releasing: “${b}”`);
  }
  if (gratitude.length) {
    presentBridge.push(`You also remember what already works: ${gratitude.join("; ")}.`);
  }

  const identitySuggestions: string[] = [];
  if (identities.length) {
    for (const phrase of identities) {
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
  if (strengths.length) {
    supportSuggestions.push(`You draw on what already works: ${strengths.join("; ")}.`);
  }
  if (a.blocks.length) {
    supportSuggestions.push(
      `As old blocks soften — ${a.blocks.join("; ")} — you choose the next right step.`
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
  if (a.timeline === "90_days") {
    futurePacing.push("Over the next ninety days, progress feels tangible and repeatable.");
  } else if (a.timeline === "12_months") {
    futurePacing.push("Across this year, the new pattern becomes natural.");
  }

  const postHypnotic =
    a.listenContext === "sleep_and_day"
      ? [
          "As you sleep or rest, these suggestions continue to settle. By day you notice yourself choosing aligned action more easily."
        ]
      : [
          "As you sleep, these suggestions continue to settle. You wake when it is time, refreshed, or you sleep through the night as your body prefers."
        ];

  const close = [
    "Rest now. You are supported. These words work with you while you sleep.",
    `Voice preference: ${a.voiceId || "unset"} · Sound bed: ${bed}`
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
  return [
    "RFTS — Goal Manifestation Production Packet",
    "============================================",
    `Member: ${name}`,
    `Email: ${input.memberEmail}`,
    `Intake status: ${input.status}`,
    `Voice: ${voice}`,
    `Frequency / sound bed: ${bed}`,
    `Listen context: ${input.answers.listenContext || "unset"}`,
    `Permission to edit draft: ${input.answers.permissionToEditDraft !== false ? "yes" : "no"}`,
    `Own-voice consent: ${input.answers.ownVoiceConsent ? "yes" : "no"}`,
    "",
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
