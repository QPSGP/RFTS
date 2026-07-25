import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import {
  getLgdIntakeById,
  listAllLgdIntakes,
  setLgdMemberFormEditAuthorization,
  updateLgdIntakeByFacilitator
} from "@/lib/db";
import {
  buildLgdProductionPacket,
  findLgdContradictionNotes,
  normalizeLgdEditHistory,
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
        memberEditAuthorizedAt: row.memberEditAuthorizedAt ?? null,
        memberEditAuthorizedBy: row.memberEditAuthorizedBy ?? null,
        editHistory: normalizeLgdEditHistory(row.editHistory),
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
  scriptDraftText: z.string().optional(),
  authorizeMemberEdit: z.boolean().optional()
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

  let updated = existing;
  if (typeof parsed.data.authorizeMemberEdit === "boolean") {
    const adminEmail = getSessionEmail() || "admin";
    const auth = await setLgdMemberFormEditAuthorization({
      id: parsed.data.id,
      authorized: parsed.data.authorizeMemberEdit,
      audit: {
        byRole: "admin",
        byEmail: adminEmail,
        byName: "Admin",
        action: parsed.data.authorizeMemberEdit
          ? "authorize_member_edit"
          : "revoke_member_edit",
        note: parsed.data.authorizeMemberEdit
          ? "Admin authorized member form edits"
          : "Admin revoked member form edits"
      }
    });
    if (!auth) {
      return NextResponse.json({ error: "Could not update authorization." }, { status: 500 });
    }
    updated = auth;
  }

  if (parsed.data.status !== undefined || parsed.data.scriptDraftText !== undefined) {
    const statusUpdated = await updateLgdIntakeByFacilitator({
      id: parsed.data.id,
      status: parsed.data.status,
      scriptDraftText: parsed.data.scriptDraftText
    });
    if (!statusUpdated) {
      return NextResponse.json({ error: "Could not update intake." }, { status: 500 });
    }
    updated = statusUpdated;
  }

  const all = await listAllLgdIntakes();
  const owned = all.find((i) => i.id === updated.id) || (await getLgdIntakeById(updated.id));
  const refreshed = await getLgdIntakeById(updated.id);
  const row = refreshed || updated;
  const answers = normalizeLgdIntakeAnswers(row.answers);
  const listRow = all.find((i) => i.id === updated.id);
  const memberEmail = listRow?.memberEmail || "";
  const firstName = listRow?.firstName ?? null;
  const lastName = listRow?.lastName ?? null;
  return NextResponse.json({
    intake: {
      id: row.id,
      status: row.status,
      scriptDraftText: row.scriptDraftText,
      approvedAt: row.approvedAt,
      updatedAt: row.updatedAt,
      memberEmail,
      firstName,
      lastName,
      answers,
      voiceId: row.voiceId,
      frequencyBedId: row.frequencyBedId,
      memberEditAuthorizedAt: row.memberEditAuthorizedAt ?? null,
      memberEditAuthorizedBy: row.memberEditAuthorizedBy ?? null,
      editHistory: normalizeLgdEditHistory(row.editHistory),
      reviewFlags: findLgdContradictionNotes(answers),
      productionPacket: buildLgdProductionPacket({
        memberEmail,
        firstName,
        lastName,
        answers,
        scriptDraftText: row.scriptDraftText || "",
        status: row.status,
        resolvedBedId: row.frequencyBedId || resolveFrequencyBedId(answers)
      })
    }
  });
}
