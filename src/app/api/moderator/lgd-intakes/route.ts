import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveModerator } from "@/lib/moderator-member-access";
import {
  getLgdIntakeById,
  listLgdIntakesForMemberEmails,
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
import { getLgdFlagsForModeratorId, isLgdAdminOnlyMode } from "@/lib/lgd-access";
import { isAdminSession } from "@/lib/auth";

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
  if (isLgdAdminOnlyMode() && !(await isAdminSession())) {
    return NextResponse.json(
      { error: "LGD tools are in admin-only preview.", adminOnly: true },
      { status: 403 }
    );
  }
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }
  const emails = moderator.assignedUserEmails || [];
  const intakes = await listLgdIntakesForMemberEmails(emails);
  const flags = await getLgdFlagsForModeratorId(moderator.id);
  return NextResponse.json({
    flags,
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
        memberEditAuthorizedAt: row.memberEditAuthorizedAt ?? null,
        memberEditAuthorizedBy: row.memberEditAuthorizedBy ?? null,
        editHistory: normalizeLgdEditHistory(row.editHistory),
        submittedAt: row.submittedAt,
        updatedAt: row.updatedAt,
        approvedAt: row.approvedAt,
        facilitatorId: row.facilitatorId
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
  if (isLgdAdminOnlyMode() && !(await isAdminSession())) {
    return NextResponse.json(
      { error: "LGD tools are in admin-only preview.", adminOnly: true },
      { status: 403 }
    );
  }
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

  const flags = await getLgdFlagsForModeratorId(moderator.id);
  const nextStatus = parsed.data.status;
  if (
    flags.lgdRequireFacilitatorApproval &&
    nextStatus &&
    (nextStatus === "in_production" || nextStatus === "complete")
  ) {
    const alreadyApproved =
      existing.status === "approved" ||
      existing.status === "in_production" ||
      existing.status === "complete" ||
      !!existing.approvedAt;
    if (!alreadyApproved) {
      return NextResponse.json(
        {
          error:
            "Approval is required before production or complete. Set status to approved first (or turn off Require facilitator approval)."
        },
        { status: 400 }
      );
    }
  }

  let updated = existing;
  if (typeof parsed.data.authorizeMemberEdit === "boolean") {
    const auth = await setLgdMemberFormEditAuthorization({
      id: parsed.data.id,
      authorized: parsed.data.authorizeMemberEdit,
      audit: {
        byRole: "facilitator",
        byEmail: moderator.email || `moderator:${moderator.id}`,
        byName: moderator.name || null,
        action: parsed.data.authorizeMemberEdit
          ? "authorize_member_edit"
          : "revoke_member_edit",
        note: parsed.data.authorizeMemberEdit
          ? "Facilitator authorized member form edits"
          : "Facilitator revoked member form edits"
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
      scriptDraftText: parsed.data.scriptDraftText,
      facilitatorId: moderator.id
    });
    if (!statusUpdated) {
      return NextResponse.json({ error: "Could not update intake." }, { status: 500 });
    }
    updated = statusUpdated;
  }

  const refreshed = (await getLgdIntakeById(updated.id)) || updated;
  const answers = normalizeLgdIntakeAnswers(refreshed.answers);
  const productionPacket = buildLgdProductionPacket({
    memberEmail: owned.memberEmail,
    firstName: owned.firstName,
    lastName: owned.lastName,
    answers,
    scriptDraftText: refreshed.scriptDraftText || "",
    status: refreshed.status,
    resolvedBedId: refreshed.frequencyBedId || resolveFrequencyBedId(answers)
  });

  return NextResponse.json({
    intake: {
      id: refreshed.id,
      status: refreshed.status,
      scriptDraftText: refreshed.scriptDraftText,
      approvedAt: refreshed.approvedAt,
      updatedAt: refreshed.updatedAt,
      memberEmail: owned.memberEmail,
      firstName: owned.firstName,
      lastName: owned.lastName,
      answers,
      voiceId: refreshed.voiceId,
      frequencyBedId: refreshed.frequencyBedId,
      memberEditAuthorizedAt: refreshed.memberEditAuthorizedAt ?? null,
      memberEditAuthorizedBy: refreshed.memberEditAuthorizedBy ?? null,
      editHistory: normalizeLgdEditHistory(refreshed.editHistory),
      reviewFlags: findLgdContradictionNotes(answers),
      productionPacket
    }
  });
}
