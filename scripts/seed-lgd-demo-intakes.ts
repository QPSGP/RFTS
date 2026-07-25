/**
 * Seed several complete LGD demo intakes into the live DB for admin review demos.
 *
 *   npx tsx scripts/seed-lgd-demo-intakes.ts
 *   npx tsx scripts/seed-lgd-demo-intakes.ts --replace   # wipe prior lgd-demo intakes first
 *
 * Uses emails lgd-demo-*@rfts.demo (not auto-deleted by smoke cleanup).
 * Login password for all demos: DemoLgd2026!
 */
import path from "path";
import { config } from "dotenv";
import bcrypt from "bcryptjs";

config({ path: path.join(process.cwd(), ".env.local") });

import {
  createLgdIntakeDraft,
  createUser,
  getLatestLgdIntakeForUser,
  getUserByEmail,
  listInterests,
  submitLgdIntake,
  upsertMemberProfile
} from "../src/lib/db";
import {
  buildGoalManifestationScriptDraft,
  buildLgdScriptDraftBlocks,
  emptyLgdIntakeAnswers,
  normalizeLgdIntakeAnswers,
  resolveFrequencyBedId,
  type LgdIntakeAnswers
} from "../src/lib/lgd-intake";
import { sql } from "@vercel/postgres";

const DEMO_PASSWORD = "DemoLgd2026!";
const replace = process.argv.includes("--replace");

type DemoPersona = {
  email: string;
  firstName: string;
  lastName: string;
  fill: (goalIds: string[]) => LgdIntakeAnswers;
};

function baseAnswers(partial: Partial<LgdIntakeAnswers>): LgdIntakeAnswers {
  return normalizeLgdIntakeAnswers({
    ...emptyLgdIntakeAnswers(),
    consentStored: true,
    permissionToEditDraft: true,
    ...partial
  });
}

const PERSONAS: DemoPersona[] = [
  {
    email: "lgd-demo-chris@rfts.demo",
    firstName: "Chris",
    lastName: "Demo (Spiritual Entrepreneur)",
    fill: (goalIds) =>
      baseAnswers({
        subconsciousPrograms: [
          "release_limiting",
          "install_identity",
          "goal_focus",
          "confidence_action"
        ],
        beliefTransformations: [
          {
            limitingId: "not_enough",
            limitingText: "I’m not enough unless I overwork",
            growthId: "safe_rest",
            growthText: "I am worthy of rest and still succeed"
          },
          {
            limitingId: "money_bad",
            limitingText: "Money is hard / spiritual people shouldn’t earn well",
            growthId: "abundance_aligned",
            growthText: "Aligned service and healthy income grow together"
          }
        ],
        lifeAreaScores: {
          physical: 6,
          mental: 7,
          emotional: 5,
          spiritual: 8,
          financial: 4,
          relationship: 5,
          work_mission: 7,
          sleep_energy: 5
        },
        challengeIds: [
          "raise_income",
          "procrastination",
          "spiritual_growth",
          "life_mission",
          "relationship_enhancement",
          "stress_overwhelm",
          "public_speaking"
        ],
        challengePriority: [
          "raise_income",
          "life_mission",
          "relationship_enhancement",
          "stress_overwhelm",
          "public_speaking"
        ],
        primaryStruggle:
          "Balancing spiritual integrity with building a profitable practice without burnout.",
        shortTermGoals:
          "Finish offer packaging; two discovery calls per week; evening wind-down ritual.",
        longTermGoals:
          "Six-figure practice that funds impact projects; strong partnership at home.",
        oneYearChange:
          "Calm evenings, consistent clients, income up meaningfully, more joy with partner.",
        ultimateGoal:
          "Be a beacon — help others thrive spiritually and financially without apology.",
        topOutcomes: [
          "I close aligned clients with ease and warmth",
          "Evenings feel calm and connected at home",
          "I speak about money and mission without tension"
        ],
        goalIds: goalIds.slice(0, 6),
        identityStatements: [
          "I am becoming a prosperous spiritual entrepreneur",
          "I am now calm, clear, and confident with clients",
          "I am now worthy of rest and wealth together"
        ],
        timeline: "12_months",
        incomeCurrentBand: "$40–60k",
        incomeDesiredBand: "$120k+",
        blocks: ["Fear of charging fully", "Overgiving", "Night scrolling"],
        pastAttempts: "Courses and free offers; undercharged; inconsistent follow-up.",
        strengths: ["Deep empathy", "Teaching gift", "Will to learn"],
        sevenKeysOrder: ["bronze", "diamond", "platinum", "ruby", "silver", "gold"],
        willToLearn: 5,
        beliefCanLearn: 4,
        metaphors: ["light", "mountain", "garden"],
        wordsLove: ["beacon", "aligned", "thrive", "ease"],
        wordsAvoid: ["hustle", "grind"],
        spiritualLanguage: "yes",
        listenContext: "sleep",
        voiceId: "terry",
        frequencyBedId: "abundance_warm",
        questionsForFacilitator:
          "How do we sequence Diamond vs Platinum with relationship goals?",
        wantsLiveLgdSessions: true
      })
  },
  {
    email: "lgd-demo-jordan@rfts.demo",
    firstName: "Jordan",
    lastName: "Demo (Focus & Sleep)",
    fill: (goalIds) =>
      baseAnswers({
        subconsciousPrograms: ["calm_rest", "goal_focus", "release_limiting"],
        beliefTransformations: [
          {
            limitingId: "cant_change",
            limitingText: "My mind never turns off",
            growthId: "can_change",
            growthText: "My mind settles; I rest and wake clear"
          }
        ],
        lifeAreaScores: {
          physical: 5,
          mental: 4,
          emotional: 5,
          spiritual: 6,
          financial: 6,
          relationship: 7,
          work_mission: 6,
          sleep_energy: 3
        },
        challengeIds: [
          "sleep_issues",
          "concentration_focus",
          "memory",
          "stress_overwhelm",
          "energy_fatigue",
          "organization_time"
        ],
        challengePriority: [
          "sleep_issues",
          "concentration_focus",
          "stress_overwhelm",
          "memory",
          "energy_fatigue"
        ],
        primaryStruggle:
          "Racing thoughts at bedtime and foggy focus during the workday.",
        shortTermGoals: "Asleep by 10:30 most nights; finish deep-work block before noon.",
        longTermGoals: "Reliable energy and mental clarity for career growth.",
        oneYearChange: "Sleeping through the night most nights; sharper daytime focus.",
        ultimateGoal: "A calm, clear mind I can trust under pressure.",
        topOutcomes: [
          "I fall asleep easily and stay asleep",
          "I focus deeply for 90-minute stretches",
          "I wake refreshed and motivated"
        ],
        goalIds: goalIds.slice(0, 5),
        identityStatements: [
          "I am becoming a calm, focused person",
          "I am now someone who rests deeply",
          "I am now clear-minded by day"
        ],
        timeline: "90_days",
        blocks: ["Phone in bed", "Caffeine after 2pm", "Worry loops"],
        pastAttempts: "Melatonin and apps; still wake at 3am.",
        strengths: ["Discipline at work", "Supportive partner"],
        sevenKeysOrder: ["bronze", "copper", "gold", "silver"],
        willToLearn: 4,
        beliefCanLearn: 4,
        metaphors: ["ocean", "quiet room"],
        wordsLove: ["calm", "clear", "rest"],
        wordsAvoid: ["panic"],
        spiritualLanguage: "minimal",
        listenContext: "sleep",
        voiceId: "associate_warm",
        frequencyBedId: "calm_delta",
        questionsForFacilitator: "Best bed + second-play schedule for insomnia pattern?",
        wantsLiveLgdSessions: false
      })
  },
  {
    email: "lgd-demo-morgan@rfts.demo",
    firstName: "Morgan",
    lastName: "Demo (Longevity & Speaking)",
    fill: (goalIds) =>
      baseAnswers({
        subconsciousPrograms: [
          "install_identity",
          "confidence_action",
          "release_limiting",
          "goal_focus"
        ],
        beliefTransformations: [
          {
            limitingId: "custom",
            limitingText: "Aging means decline",
            growthId: "custom",
            growthText: "My body regenerates; I age with vitality"
          },
          {
            limitingId: "will_fail",
            limitingText: "I freeze when I speak in public",
            growthId: "learn_succeed",
            growthText: "I speak with ease, warmth, and inspiration"
          }
        ],
        lifeAreaScores: {
          physical: 5,
          mental: 6,
          emotional: 6,
          spiritual: 7,
          financial: 6,
          relationship: 6,
          work_mission: 7,
          sleep_energy: 5
        },
        challengeIds: [
          "aging_longevity",
          "public_speaking",
          "exercise_consistency",
          "creativity_block",
          "weight_habits"
        ],
        challengePriority: [
          "aging_longevity",
          "public_speaking",
          "exercise_consistency",
          "creativity_block"
        ],
        primaryStruggle:
          "Want healthy longevity and confidence presenting ideas to groups.",
        shortTermGoals: "Walk 30 minutes daily; one short talk per month.",
        longTermGoals: "Vibrant health into later decades; inspiring speaker.",
        oneYearChange: "Stronger stamina, lighter body, comfortable on stage.",
        ultimateGoal: "Live long enough — and well enough — to share what I’ve learned.",
        topOutcomes: [
          "I move with ease and enjoy exercise",
          "I present ideas clearly and warmly",
          "I feel younger and more energetic"
        ],
        goalIds: goalIds.slice(0, 7),
        identityStatements: [
          "I am becoming vital and strong",
          "I am now a confident, inspiring speaker",
          "I am now someone whose body cooperates"
        ],
        timeline: "ongoing",
        blocks: ["Inconsistent workouts", "Stage nerves"],
        pastAttempts: "Gym memberships that fade; avoided speaking opportunities.",
        strengths: ["Storytelling", "Curiosity", "Community ties"],
        sevenKeysOrder: ["bronze", "gold", "silver", "copper", "diamond"],
        willToLearn: 5,
        beliefCanLearn: 5,
        metaphors: ["sunrise", "mountain trail"],
        wordsLove: ["vital", "inspired", "strong"],
        wordsAvoid: ["old", "fail"],
        spiritualLanguage: "yes",
        listenContext: "sleep_and_day",
        voiceId: "terry",
        frequencyBedId: "heart_coherence",
        questionsForFacilitator: "How to pair Gold Key health with Silver speaking work?",
        wantsLiveLgdSessions: true
      })
  }
];

async function pickGoalIds(): Promise<string[]> {
  const interests = await listInterests();
  const preferred = [
    /confidence/i,
    /sleep/i,
    /memory/i,
    /success/i,
    /wealth|money|abundance/i,
    /relationship|love/i,
    /stress/i,
    /inspiration|creativ/i,
    /health|longevity|weight/i,
    /speak/i
  ];
  const picked: string[] = [];
  for (const re of preferred) {
    const hit = interests.find((i) => re.test(i.name) && !picked.includes(i.id));
    if (hit) picked.push(hit.id);
  }
  for (const i of interests) {
    if (picked.length >= 8) break;
    if (!picked.includes(i.id)) picked.push(i.id);
  }
  return picked;
}

async function ensureUser(email: string, firstName: string, lastName: string) {
  let user = await getUserByEmail(email);
  if (!user) {
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    user = await createUser(email, hash);
    console.log(`  created user ${email}`);
  } else {
    console.log(`  existing user ${email}`);
  }
  await upsertMemberProfile({
    userId: user.id,
    firstName,
    lastName,
    referralSource: "lgd-demo",
    hadLgdSession: true,
    adultConsent: true,
    yearBorn: 1985
  } as Parameters<typeof upsertMemberProfile>[0]);
  return user;
}

async function removePriorDemoIntakes(userId: string) {
  await sql`
    DELETE FROM lgd_intakes
    WHERE user_id = ${userId}
  `;
}

async function seedOne(persona: DemoPersona, goalPool: string[]) {
  const user = await ensureUser(persona.email, persona.firstName, persona.lastName);
  if (replace) {
    await removePriorDemoIntakes(user.id);
  } else {
    const existing = await getLatestLgdIntakeForUser(user.id);
    if (existing && existing.status !== "draft") {
      console.log(`  skip ${persona.email} — already has ${existing.status} intake (use --replace)`);
      return;
    }
    if (existing?.status === "draft") {
      await removePriorDemoIntakes(user.id);
    }
  }

  const answers = persona.fill(goalPool);
  const draft = await createLgdIntakeDraft(user.id, answers);
  const resolvedBedId = resolveFrequencyBedId(answers);
  const interests = await listInterests();
  const goalNames = answers.goalIds
    .map((id) => interests.find((i) => i.id === id)?.name)
    .filter((n): n is string => !!n);
  const filled = { ...answers, frequencyBedId: resolvedBedId };
  const scriptDraft = buildLgdScriptDraftBlocks({
    firstName: persona.firstName,
    answers: filled,
    goalNames,
    resolvedBedId
  });
  const scriptDraftText = buildGoalManifestationScriptDraft({
    firstName: persona.firstName,
    answers: filled,
    goalNames,
    resolvedBedId
  });

  const submitted = await submitLgdIntake({
    id: draft.id,
    userId: user.id,
    answers: filled,
    scriptDraftText,
    scriptDraft,
    voiceId: filled.voiceId || null,
    frequencyBedId: resolvedBedId,
    priceCents: 39700,
    audit: {
      byRole: "admin",
      byEmail: "lgd-demo-seed@rfts.demo",
      byName: "LGD Demo Seed",
      action: "submit",
      note: "Seeded complete LGD demo sample for live review"
    }
  });
  if (!submitted) {
    throw new Error(`Failed to submit intake for ${persona.email}`);
  }

  // Mark paid so member edit rules and UI show paid state.
  await sql`
    UPDATE lgd_intakes
    SET
      paid_at = now(),
      price_cents = 39700,
      updated_at = now()
    WHERE id = ${submitted.id}
  `;

  console.log(`  submitted ${persona.email} → intake ${submitted.id} (${filled.sevenKeysOrder.join(" → ")})`);
}

async function main() {
  if (!process.env.POSTGRES_URL && !process.env.POSTGRES_URL_NON_POOLING) {
    console.error("POSTGRES_URL missing in .env.local");
    process.exit(1);
  }
  console.log(`Seeding LGD demo intakes${replace ? " (--replace)" : ""}…`);
  // Ensure columns exist
  await sql`ALTER TABLE lgd_intakes ADD COLUMN IF NOT EXISTS edit_history jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE lgd_intakes ADD COLUMN IF NOT EXISTS member_edit_authorized_at timestamptz`;
  await sql`ALTER TABLE lgd_intakes ADD COLUMN IF NOT EXISTS member_edit_authorized_by text`;
  await sql`ALTER TABLE lgd_intakes ADD COLUMN IF NOT EXISTS paid_at timestamptz`;

  const goalPool = await pickGoalIds();
  console.log(`Using ${goalPool.length} goal id(s) from interests catalog`);

  for (const persona of PERSONAS) {
    console.log(`\n${persona.firstName} ${persona.lastName}`);
    await seedOne(persona, goalPool);
  }

  console.log("\nDone. Open /admin/lgd — search Demo or lgd-demo.");
  console.log(`Demo member password (if logging in): ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
