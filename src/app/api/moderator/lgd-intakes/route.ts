import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveModerator } from "@/lib/moderator-member-access";
import {
  getLgdIntakeById,
  listLgdIntakesForMemberEmails,
  updateLgdIntakeByFacilitator
} from "@/lib/db";
import {
  buildLgdProductionPacket,
  findLgdContradictionNotes,
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
  scriptDraftText: z.string().optional()
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

  const updated = await updateLgdIntakeByFacilitator({
    id: parsed.data.id,
    status: parsed.data.status,
    scriptDraftText: parsed.data.scriptDraftText,
    facilitatorId: moderator.id
  });
  if (!updated) {
    return NextResponse.json({ error: "Could not update intake." }, { status: 500 });
  }

  const answers = normalizeLgdIntakeAnswers(updated.answers);
  const productionPacket = buildLgdProductionPacket({
    memberEmail: owned.memberEmail,
    firstName: owned.firstName,
    lastName: owned.lastName,
    answers,
    scriptDraftText: updated.scriptDraftText || "",
    status: updated.status,
    resolvedBedId: updated.frequencyBedId || resolveFrequencyBedId(answers)
  });

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
      answers,
      voiceId: updated.voiceId,
      frequencyBedId: updated.frequencyBedId,
      reviewFlags: findLgdContradictionNotes(answers),
      productionPacket
    }
  });
}
