import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSessionEmail } from "@/lib/user-auth";
import {
  createLgdIntakeDraft,
  getFacilitatorsForMemberEmail,
  getLatestLgdIntakeForUser,
  getMemberProfileByUserId,
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
import {
  getLgdFlagsForMemberEmail,
  getLgdPriceDisplay,
  isLgdAdminOnlyMode
} from "@/lib/lgd-access";
import { isAdminSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { getLgdIntakeSubmittedFacilitatorEmailContent } from "@/lib/email-templates";

async function rejectIfAdminOnlyPreview(): Promise<NextResponse | null> {
  if (isLgdAdminOnlyMode() && !(await isAdminSession())) {
    return NextResponse.json(
      {
        error:
          "Life Guidance Discovery is in admin-only preview. It will open to members when ready.",
        adminOnly: true
      },
      { status: 403 }
    );
  }
  return null;
}

const patchSchema = z.object({
  answers: z.record(z.string(), z.unknown())
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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    submittedAt: row.submittedAt,
    approvedAt: row.approvedAt,
    editable: row.status === "draft"
  };
}

export async function GET() {
  const blocked = await rejectIfAdminOnlyPreview();
  if (blocked) return blocked;
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const user = await getUserProfile(email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const { flags } = await getLgdFlagsForMemberEmail(email);
  if (!flags.lgdElectronicIntake) {
    return NextResponse.json(
      {
        error: "Electronic Life Guidance Discovery is not currently offered for your account.",
        flags
      },
      { status: 403 }
    );
  }
  const memberProfile = await getMemberProfileByUserId(user.id);
  let intake = await getLatestLgdIntakeForUser(user.id);
  if (!intake) {
    intake = await createLgdIntakeDraft(user.id, emptyLgdIntakeAnswers());
  }
  const price = getLgdPriceDisplay();
  return NextResponse.json({
    intake: serializeIntake(intake),
    firstName: memberProfile?.firstName ?? null,
    hadLgdSession: memberProfile?.hadLgdSession ?? false,
    flags,
    priceLabel: price.label
  });
}

export async function PATCH(request: Request) {
  const blocked = await rejectIfAdminOnlyPreview();
  if (blocked) return blocked;
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const user = await getUserProfile(email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const { flags } = await getLgdFlagsForMemberEmail(email);
  if (!flags.lgdElectronicIntake) {
    return NextResponse.json(
      { error: "Electronic Life Guidance Discovery is not currently offered for your account." },
      { status: 403 }
    );
  }
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  let answers = normalizeLgdIntakeAnswers(parsed.data.answers);
  if (!flags.lgdProfessionalVoices && answers.voiceId && answers.voiceId !== "member_own") {
    answers = { ...answers, voiceId: "" };
  }
  if (!flags.lgdMemberOwnVoice && answers.voiceId === "member_own") {
    answers = { ...answers, voiceId: "", ownVoiceConsent: false };
  }
  if (!flags.lgdFrequencyBeds) {
    answers = { ...answers, frequencyBedId: "choose_for_me" };
  }

  let intake = await getLatestLgdIntakeForUser(user.id);
  if (!intake) {
    intake = await createLgdIntakeDraft(user.id, answers);
  } else if (intake.status !== "draft") {
    return NextResponse.json(
      { error: "This intake was already submitted and can no longer be edited." },
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

  const memberProfile = await getMemberProfileByUserId(user.id);
  if (answers.alreadyHadLiveLgd && memberProfile && !memberProfile.hadLgdSession) {
    await upsertMemberProfile({
      ...memberProfile,
      userId: user.id,
      hadLgdSession: true
    });
  }

  return NextResponse.json({ intake: serializeIntake(intake), flags });
}

export async function POST(request: Request) {
  const blocked = await rejectIfAdminOnlyPreview();
  if (blocked) return blocked;
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const user = await getUserProfile(email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const { flags, primaryFacilitatorId } = await getLgdFlagsForMemberEmail(email);
  if (!flags.lgdElectronicIntake) {
    return NextResponse.json(
      { error: "Electronic Life Guidance Discovery is not currently offered for your account." },
      { status: 403 }
    );
  }
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  let answers = normalizeLgdIntakeAnswers(parsed.data.answers);
  if (!answers.consentStored) {
    return NextResponse.json(
      { error: "Please confirm consent to store your answers before submitting." },
      { status: 400 }
    );
  }
  if (answers.crisisFlag) {
    return NextResponse.json(
      {
        error:
          "Because you indicated a crisis or urgent safety concern, please contact a human facilitator or emergency services. This intake will not auto-generate a script."
      },
      { status: 400 }
    );
  }
  if (!answers.identityStatements.length && !answers.topOutcomes.length) {
    return NextResponse.json(
      {
        error:
          "Add at least one identity statement (“I am now…”) or top outcome before submitting."
      },
      { status: 400 }
    );
  }
  if (answers.voiceId === "member_own" && !flags.lgdMemberOwnVoice) {
    return NextResponse.json(
      { error: "Member’s own voice is not enabled yet. Choose a professional voice." },
      { status: 400 }
    );
  }
  if (answers.voiceId === "member_own" && !answers.ownVoiceConsent) {
    return NextResponse.json(
      { error: "Please confirm consent to use your own voice before submitting." },
      { status: 400 }
    );
  }

  let intake = await getLatestLgdIntakeForUser(user.id);
  if (!intake) {
    intake = await createLgdIntakeDraft(user.id, answers);
  } else if (intake.status !== "draft") {
    return NextResponse.json(
      { error: "This intake was already submitted." },
      { status: 409 }
    );
  }

  const interests = await listInterests();
  const goalNames = answers.goalIds
    .map((id) => interests.find((i) => i.id === id)?.name)
    .filter((n): n is string => !!n);

  const memberProfile = await getMemberProfileByUserId(user.id);
  const resolvedBedId = resolveFrequencyBedId(answers);
  answers = { ...answers, frequencyBedId: resolvedBedId };

  let scriptDraftText = "";
  let scriptDraft: unknown = null;
  if (flags.lgdScriptDraft) {
    scriptDraft = buildLgdScriptDraftBlocks({
      firstName: memberProfile?.firstName || "friend",
      answers,
      goalNames,
      resolvedBedId
    });
    scriptDraftText = buildGoalManifestationScriptDraft({
      firstName: memberProfile?.firstName || "friend",
      answers,
      goalNames,
      resolvedBedId
    });
  } else {
    scriptDraftText =
      "Script draft generation is disabled for this practice. Facilitator will write the Goal Manifestation script from the intake brief.";
  }

  const facilitators = await getFacilitatorsForMemberEmail(email);
  const facilitatorId = primaryFacilitatorId || facilitators[0]?.id || null;
  const price = getLgdPriceDisplay();

  const submitted = await submitLgdIntake({
    id: intake.id,
    userId: user.id,
    answers,
    scriptDraftText,
    scriptDraft,
    voiceId: answers.voiceId || null,
    frequencyBedId: resolvedBedId,
    facilitatorId,
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

  for (const fac of facilitators) {
    if (!fac.email) continue;
    const content = getLgdIntakeSubmittedFacilitatorEmailContent({
      facilitatorName: fac.name,
      memberEmail: email,
      memberFirstName: memberProfile?.firstName,
      memberLastName: memberProfile?.lastName
    });
    const result = await sendEmail({
      to: fac.email,
      subject: content.subject,
      html: content.html,
      text: content.text,
      skipStaffBcc: true
    });
    if (!result.ok) {
      console.error("[POST /api/member/lgd-intake] facilitator notify failed:", result.error);
    }
  }

  return NextResponse.json({
    intake: serializeIntake(submitted),
    scriptDraftText,
    flags
  });
}
