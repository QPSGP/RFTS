import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import {
  getLgdIntakeById,
  listAllLgdIntakes,
  updateLgdIntakeByFacilitator
} from "@/lib/db";
import {
  buildLgdProductionPacket,
  findLgdContradictionNotes,
  normalizeLgdIntakeAnswers,
  resolveFrequencyBedId
} from "@/lib/lgd-intake";

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
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const intakes = await listAllLgdIntakes();
  return NextResponse.json({
    adminOnly: true,
    intakes: intakes.map((row) => {
      const answers = normalizeLgdIntakeAnswers(row.answers);
      return {
        id: row.id,
        userId: row.userId,
        memberEmail: row.memberEmail,
        firstName: row.firstName,
        lastName: row.lastName,
        status: row.status,
        answers,
        scriptDraftText: row.scriptDraftText,
        voiceId: row.voiceId,
        frequencyBedId: row.frequencyBedId || resolveFrequencyBedId(answers),
        reviewFlags: findLgdContradictionNotes(answers),
        paidAt: row.paidAt ?? null,
        ownVoiceAudioUrl: row.ownVoiceAudioUrl ?? null,
        submittedAt: row.submittedAt,
        updatedAt: row.updatedAt,
        approvedAt: row.approvedAt
      };
    })
  });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUSES).optional(),
  scriptDraftText: z.string().optional()
});

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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
  const updated = await updateLgdIntakeByFacilitator({
    id: parsed.data.id,
    status: parsed.data.status,
    scriptDraftText: parsed.data.scriptDraftText
  });
  if (!updated) {
    return NextResponse.json({ error: "Could not update intake." }, { status: 500 });
  }
  const all = await listAllLgdIntakes();
  const owned = all.find((i) => i.id === updated.id);
  const answers = normalizeLgdIntakeAnswers(updated.answers);
  return NextResponse.json({
    intake: {
      id: updated.id,
      status: updated.status,
      scriptDraftText: updated.scriptDraftText,
      approvedAt: updated.approvedAt,
      updatedAt: updated.updatedAt,
      memberEmail: owned?.memberEmail || "",
      firstName: owned?.firstName ?? null,
      lastName: owned?.lastName ?? null,
      answers,
      voiceId: updated.voiceId,
      frequencyBedId: updated.frequencyBedId,
      reviewFlags: findLgdContradictionNotes(answers),
      productionPacket: buildLgdProductionPacket({
        memberEmail: owned?.memberEmail || "",
        firstName: owned?.firstName ?? null,
        lastName: owned?.lastName ?? null,
        answers,
        scriptDraftText: updated.scriptDraftText || "",
        status: updated.status,
        resolvedBedId: updated.frequencyBedId || resolveFrequencyBedId(answers)
      })
    }
  });
}
