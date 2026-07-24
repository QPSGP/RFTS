import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveModerator } from "@/lib/moderator-member-access";
import {
  getLgdIntakeById,
  listLgdIntakesForMemberEmails,
  updateLgdIntakeByFacilitator
} from "@/lib/db";
import { normalizeLgdIntakeAnswers } from "@/lib/lgd-intake";

const STATUSES = [
  "submitted",
  "in_review",
  "script_ready",
  "approved",
  "in_production",
  "complete",
  "cancelled"
] as const;

export async function GET() {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }
  const emails = moderator.assignedUserEmails || [];
  const intakes = await listLgdIntakesForMemberEmails(emails);
  return NextResponse.json({
    intakes: intakes.map((row) => ({
      id: row.id,
      userId: row.userId,
      memberEmail: row.memberEmail,
      firstName: row.firstName,
      lastName: row.lastName,
      status: row.status,
      answers: normalizeLgdIntakeAnswers(row.answers),
      scriptDraftText: row.scriptDraftText,
      voiceId: row.voiceId,
      frequencyBedId: row.frequencyBedId,
      submittedAt: row.submittedAt,
      updatedAt: row.updatedAt,
      approvedAt: row.approvedAt,
      facilitatorId: row.facilitatorId
    }))
  });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUSES).optional(),
  scriptDraftText: z.string().optional()
});

export async function PATCH(request: Request) {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const existing = await getLgdIntakeById(parsed.data.id);
  if (!existing) {
    return NextResponse.json({ error: "Intake not found." }, { status: 404 });
  }

  const assigned = new Set(
    (moderator.assignedUserEmails || []).map((e) => e.trim().toLowerCase())
  );
  // Resolve member email from users table via profile list match
  const intakes = await listLgdIntakesForMemberEmails([...assigned]);
  const owned = intakes.find((i) => i.id === parsed.data.id);
  if (!owned) {
    return NextResponse.json(
      { error: "This intake is not for a member assigned to you." },
      { status: 403 }
    );
  }

  const updated = await updateLgdIntakeByFacilitator({
    id: parsed.data.id,
    status: parsed.data.status,
    scriptDraftText: parsed.data.scriptDraftText,
    facilitatorId: moderator.id
  });
  if (!updated) {
    return NextResponse.json({ error: "Could not update intake." }, { status: 500 });
  }

  return NextResponse.json({
    intake: {
      id: updated.id,
      status: updated.status,
      scriptDraftText: updated.scriptDraftText,
      approvedAt: updated.approvedAt,
      updatedAt: updated.updatedAt,
      memberEmail: owned.memberEmail,
      firstName: owned.firstName,
      lastName: owned.lastName,
      answers: normalizeLgdIntakeAnswers(updated.answers),
      voiceId: updated.voiceId,
      frequencyBedId: updated.frequencyBedId
    }
  });
}
