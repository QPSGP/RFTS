import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSessionEmail } from "@/lib/user-auth";
import {
  createLgdIntakeDraft,
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
  emptyLgdIntakeAnswers,
  normalizeLgdIntakeAnswers
} from "@/lib/lgd-intake";

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
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const user = await getUserProfile(email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const memberProfile = await getMemberProfileByUserId(user.id);
  let intake = await getLatestLgdIntakeForUser(user.id);
  if (!intake) {
    intake = await createLgdIntakeDraft(user.id, emptyLgdIntakeAnswers());
  }
  return NextResponse.json({
    intake: serializeIntake(intake),
    firstName: memberProfile?.firstName ?? null,
    hadLgdSession: memberProfile?.hadLgdSession ?? false
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
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const answers = normalizeLgdIntakeAnswers(parsed.data.answers);
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
  return NextResponse.json({ intake: serializeIntake(intake) });
}

export async function POST(request: Request) {
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const user = await getUserProfile(email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const answers = normalizeLgdIntakeAnswers(parsed.data.answers);
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
  const scriptDraftText = buildGoalManifestationScriptDraft({
    firstName: memberProfile?.firstName || "friend",
    answers,
    goalNames
  });

  const submitted = await submitLgdIntake({
    id: intake.id,
    userId: user.id,
    answers,
    scriptDraftText,
    voiceId: answers.voiceId || null,
    frequencyBedId: answers.frequencyBedId || null
  });
  if (!submitted) {
    return NextResponse.json({ error: "Could not submit intake." }, { status: 500 });
  }

  if (memberProfile) {
    await upsertMemberProfile({
      ...memberProfile,
      userId: user.id,
      hadLgdSession: true
    });
  } else {
    await upsertMemberProfile({
      userId: user.id,
      hadLgdSession: true
    });
  }

  return NextResponse.json({
    intake: serializeIntake(submitted),
    scriptDraftText
  });
}
