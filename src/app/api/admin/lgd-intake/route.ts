import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import {
  createLgdIntakeDraft,
  getLatestLgdIntakeForUser,
  getMemberProfileByUserId,
  getUserByEmail,
  getUserProfile,
  listInterests,
  submitLgdIntake,
  updateLgdIntakeDraft,
  upsertMemberProfile
} from "@/lib/db";
import {
  buildGoalManifestationScriptDraft,
  buildLgdScriptDraftBlocks,
  emptyLgdIntakeAnswers,
  normalizeLgdIntakeAnswers,
  resolveFrequencyBedId
} from "@/lib/lgd-intake";
import { getLgdPriceDisplay } from "@/lib/lgd-access";
import { defaultLgdFacilitatorFeatureFlags } from "@/lib/lgd-intake";

const bodySchema = z.object({
  memberEmail: z.string().email(),
  answers: z.record(z.string(), z.unknown()).optional(),
  action: z.literal("startNew").optional()
});

function serializeIntake(row: NonNullable<Awaited<ReturnType<typeof getLatestLgdIntakeForUser>>>) {
  const answers = normalizeLgdIntakeAnswers(row.answers);
  return {
    id: row.id,
    status: row.status,
    answers,
    scriptDraftText: row.scriptDraftText,
    voiceId: row.voiceId || answers.voiceId || null,
    frequencyBedId: row.frequencyBedId || answers.frequencyBedId || null,
    paidAt: row.paidAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    submittedAt: row.submittedAt,
    approvedAt: row.approvedAt,
    editable: row.status === "draft",
    needsPayment: false,
    canStartNew: row.status !== "draft"
  };
}

/** Admin runs / previews electronic LGD intake on behalf of a member (no payment required). */
export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const memberEmail = url.searchParams.get("memberEmail")?.trim().toLowerCase();
  const forceNew = url.searchParams.get("new") === "1";
  if (!memberEmail) {
    return NextResponse.json({ error: "memberEmail is required." }, { status: 400 });
  }
  const user = await getUserProfile(memberEmail);
  if (!user) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  const memberProfile = await getMemberProfileByUserId(user.id);
  let intake = await getLatestLgdIntakeForUser(user.id);
  if (!intake || forceNew) {
    intake = await createLgdIntakeDraft(user.id, emptyLgdIntakeAnswers());
  }
  return NextResponse.json({
    intake: serializeIntake(intake),
    firstName: memberProfile?.firstName ?? null,
    hadLgdSession: memberProfile?.hadLgdSession ?? false,
    flags: defaultLgdFacilitatorFeatureFlags(),
    priceLabel: getLgdPriceDisplay().label,
    memberEmail,
    adminBypassPayment: true
  });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !parsed.data.answers) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const email = parsed.data.memberEmail.trim().toLowerCase();
  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  const answers = normalizeLgdIntakeAnswers(parsed.data.answers);
  let intake = await getLatestLgdIntakeForUser(user.id);
  if (!intake) {
    intake = await createLgdIntakeDraft(user.id, answers);
  } else if (intake.status !== "draft") {
    return NextResponse.json(
      {
        error:
          "This intake was already submitted. Use Start new intake to create another draft."
      },
      { status: 409 }
    );
  } else {
    const updated = await updateLgdIntakeDraft({
      id: intake.id,
      userId: user.id,
      answers,
      voiceId: answers.voiceId || null,
      frequencyBedId: answers.frequencyBedId || null
    });
    if (!updated) {
      return NextResponse.json({ error: "Could not save draft." }, { status: 500 });
    }
    intake = updated;
  }
  return NextResponse.json({ intake: serializeIntake(intake) });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (parsed.data.action === "startNew") {
    const email = parsed.data.memberEmail.trim().toLowerCase();
    const user = await getUserProfile(email);
    if (!user) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }
    const intake = await createLgdIntakeDraft(user.id, emptyLgdIntakeAnswers());
    return NextResponse.json({ intake: serializeIntake(intake) });
  }

  if (!parsed.data.answers) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const email = parsed.data.memberEmail.trim().toLowerCase();
  const user = await getUserProfile(email);
  if (!user) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  let answers = normalizeLgdIntakeAnswers(parsed.data.answers);
  if (!answers.consentStored) {
    return NextResponse.json({ error: "Consent is required before submit." }, { status: 400 });
  }
  if (answers.crisisFlag) {
    return NextResponse.json(
      { error: "Crisis flag set — do not auto-submit; handle with a human facilitator." },
      { status: 400 }
    );
  }
  if (!answers.subconsciousPrograms.length) {
    return NextResponse.json(
      {
        error:
          "Choose at least one option for how the subconscious should be programmed."
      },
      { status: 400 }
    );
  }
  const completeBeliefPairs = answers.beliefTransformations.filter(
    (p) => p.limitingText.trim() && p.growthText.trim()
  );
  if (!completeBeliefPairs.length) {
    return NextResponse.json(
      {
        error:
          "Select at least one limiting belief and the growth belief that should replace it."
      },
      { status: 400 }
    );
  }
  if (
    !answers.identityStatements.length &&
    !answers.topOutcomes.length &&
    !completeBeliefPairs.length
  ) {
    return NextResponse.json(
      { error: "Add at least one identity statement or top outcome." },
      { status: 400 }
    );
  }
  if (answers.voiceId === "member_own" && !answers.ownVoiceConsent) {
    return NextResponse.json(
      {
        error:
          "Voice Recording Agreement consent is required when using the member’s own voice."
      },
      { status: 400 }
    );
  }

  let intake = await getLatestLgdIntakeForUser(user.id);
  if (!intake) {
    intake = await createLgdIntakeDraft(user.id, answers);
  } else if (intake.status !== "draft") {
    return NextResponse.json({ error: "This intake was already submitted." }, { status: 409 });
  }

  const interests = await listInterests();
  const goalNames = answers.goalIds
    .map((id) => interests.find((i) => i.id === id)?.name)
    .filter((n): n is string => !!n);
  const memberProfile = await getMemberProfileByUserId(user.id);
  const resolvedBedId = resolveFrequencyBedId(answers);
  answers = { ...answers, frequencyBedId: resolvedBedId };
  const scriptDraft = buildLgdScriptDraftBlocks({
    firstName: memberProfile?.firstName || "friend",
    answers,
    goalNames,
    resolvedBedId
  });
  const scriptDraftText = buildGoalManifestationScriptDraft({
    firstName: memberProfile?.firstName || "friend",
    answers,
    goalNames,
    resolvedBedId
  });
  const price = getLgdPriceDisplay();
  const submitted = await submitLgdIntake({
    id: intake.id,
    userId: user.id,
    answers,
    scriptDraftText,
    scriptDraft,
    voiceId: answers.voiceId || null,
    frequencyBedId: resolvedBedId,
    priceCents: price.priceCents
  });
  if (!submitted) {
    return NextResponse.json({ error: "Could not submit intake." }, { status: 500 });
  }
  await upsertMemberProfile({
    ...(memberProfile || { userId: user.id }),
    userId: user.id,
    hadLgdSession: true
  });
  return NextResponse.json({
    intake: serializeIntake(submitted),
    scriptDraftText
  });
}
