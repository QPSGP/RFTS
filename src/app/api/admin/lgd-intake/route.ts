import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import {
  createLgdIntakeDraft,
  getLatestLgdIntakeForUser,
  getMemberProfileByUserId,
  getUserByEmail,
  getUserProfile,
  listInterests,
  setLgdMemberFormEditAuthorization,
  submitLgdIntake,
  updateLgdIntakeAnswersWithAudit,
  upsertMemberProfile
} from "@/lib/db";
import {
  buildGoalManifestationScriptDraft,
  buildLgdScriptDraftBlocks,
  canMemberEditLgdForm,
  emptyLgdIntakeAnswers,
  normalizeLgdEditHistory,
  normalizeLgdIntakeAnswers,
  resolveFrequencyBedId
} from "@/lib/lgd-intake";
import { getLgdPriceDisplay } from "@/lib/lgd-access";
import { defaultLgdFacilitatorFeatureFlags } from "@/lib/lgd-intake";

const bodySchema = z.object({
  memberEmail: z.string().email(),
  answers: z.record(z.string(), z.unknown()).optional(),
  action: z.enum(["startNew", "authorizeMemberEdit", "revokeMemberEdit"]).optional(),
  regenerateScript: z.boolean().optional()
});

function serializeIntake(
  row: NonNullable<Awaited<ReturnType<typeof getLatestLgdIntakeForUser>>>,
  opts?: { asAdmin?: boolean }
) {
  const answers = normalizeLgdIntakeAnswers(row.answers);
  const asAdmin = opts?.asAdmin !== false;
  return {
    id: row.id,
    status: row.status,
    answers,
    scriptDraftText: row.scriptDraftText,
    voiceId: row.voiceId || answers.voiceId || null,
    frequencyBedId: row.frequencyBedId || answers.frequencyBedId || null,
    paidAt: row.paidAt ?? null,
    memberEditAuthorizedAt: row.memberEditAuthorizedAt ?? null,
    memberEditAuthorizedBy: row.memberEditAuthorizedBy ?? null,
    editHistory: normalizeLgdEditHistory(row.editHistory),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    submittedAt: row.submittedAt,
    approvedAt: row.approvedAt,
    /** Admin can always edit the form (except cancelled). */
    editable: asAdmin ? row.status !== "cancelled" : canMemberEditLgdForm(row),
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
    intake: serializeIntake(intake, { asAdmin: true }),
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
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const email = parsed.data.memberEmail.trim().toLowerCase();
  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  if (
    parsed.data.action === "authorizeMemberEdit" ||
    parsed.data.action === "revokeMemberEdit"
  ) {
    let intake = await getLatestLgdIntakeForUser(user.id);
    if (!intake) {
      return NextResponse.json({ error: "No intake found." }, { status: 404 });
    }
    const adminEmail = getSessionEmail() || "admin";
    const updated = await setLgdMemberFormEditAuthorization({
      id: intake.id,
      authorized: parsed.data.action === "authorizeMemberEdit",
      audit: {
        byRole: "admin",
        byEmail: adminEmail,
        byName: "Admin",
        action:
          parsed.data.action === "authorizeMemberEdit"
            ? "authorize_member_edit"
            : "revoke_member_edit",
        note:
          parsed.data.action === "authorizeMemberEdit"
            ? "Admin authorized member to edit the intake form"
            : "Admin revoked member form edit access"
      }
    });
    if (!updated) {
      return NextResponse.json({ error: "Could not update authorization." }, { status: 500 });
    }
    return NextResponse.json({ intake: serializeIntake(updated, { asAdmin: true }) });
  }

  if (!parsed.data.answers) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const answers = normalizeLgdIntakeAnswers(parsed.data.answers);
  let intake = await getLatestLgdIntakeForUser(user.id);
  if (!intake) {
    intake = await createLgdIntakeDraft(user.id, answers);
  }
  if (intake.status === "cancelled") {
    return NextResponse.json({ error: "Cancelled intakes cannot be edited." }, { status: 409 });
  }

  const regenerate = parsed.data.regenerateScript !== false && intake.status !== "draft";
  let scriptDraftText: string | undefined;
  let scriptDraft: unknown;
  if (regenerate || intake.status === "draft") {
    const interests = await listInterests();
    const goalNames = answers.goalIds
      .map((id) => interests.find((i) => i.id === id)?.name)
      .filter((n): n is string => !!n);
    const memberProfile = await getMemberProfileByUserId(user.id);
    const resolvedBedId = resolveFrequencyBedId(answers);
    const filled = { ...answers, frequencyBedId: resolvedBedId };
    scriptDraft = buildLgdScriptDraftBlocks({
      firstName: memberProfile?.firstName || "friend",
      answers: filled,
      goalNames,
      resolvedBedId
    });
    scriptDraftText = buildGoalManifestationScriptDraft({
      firstName: memberProfile?.firstName || "friend",
      answers: filled,
      goalNames,
      resolvedBedId
    });
  }

  const resolvedBedId = resolveFrequencyBedId(answers);
  const adminEmail = getSessionEmail() || "admin";
  const updated = await updateLgdIntakeAnswersWithAudit({
    id: intake.id,
    userId: user.id,
    answers: { ...answers, frequencyBedId: resolvedBedId },
    voiceId: answers.voiceId || null,
    frequencyBedId: resolvedBedId,
    scriptDraftText: scriptDraftText,
    scriptDraft,
    audit: {
      byRole: "admin",
      byEmail: adminEmail,
      byName: "Admin",
      action: "save_answers",
      note:
        intake.status === "draft"
          ? "Admin saved draft answers"
          : "Admin edited submitted intake form" +
            (scriptDraftText !== undefined ? "; script regenerated from form" : "")
    }
  });
  if (!updated) {
    return NextResponse.json({ error: "Could not save answers." }, { status: 500 });
  }
  return NextResponse.json({
    intake: serializeIntake(updated, { asAdmin: true }),
    scriptDraftText: updated.scriptDraftText
  });
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
    return NextResponse.json({ intake: serializeIntake(intake, { asAdmin: true }) });
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
    priceCents: price.priceCents,
    audit: {
      byRole: "admin",
      byEmail: getSessionEmail() || "admin",
      byName: "Admin",
      action: "submit",
      note: "Admin submitted intake"
    }
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
    intake: serializeIntake(submitted, { asAdmin: true }),
    scriptDraftText
  });
}
