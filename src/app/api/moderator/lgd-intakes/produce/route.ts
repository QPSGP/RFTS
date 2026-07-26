import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { getLgdIntakeById, getUserById } from "@/lib/db";
import { isLgdAdminOnlyMode } from "@/lib/lgd-access";
import { isOpenAiTtsConfigured, produceLgdCgmrForIntake } from "@/lib/lgd-cgmr-produce";
import { requireActiveModerator } from "@/lib/moderator-member-access";

const bodySchema = z.object({
  intakeId: z.string().uuid(),
  mode: z.enum(["generate", "assign"]),
  audioUrl: z.string().url().optional(),
  scriptOverride: z.string().optional()
});

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
  return NextResponse.json({
    aiGenerateAvailable: isOpenAiTtsConfigured()
  });
}

export async function POST(request: Request) {
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
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  if (parsed.data.mode === "assign" && !parsed.data.audioUrl) {
    return NextResponse.json({ error: "audioUrl is required for assign mode." }, { status: 400 });
  }

  const intake = await getLgdIntakeById(parsed.data.intakeId);
  if (!intake) {
    return NextResponse.json({ error: "Intake not found." }, { status: 404 });
  }
  const user = await getUserById(intake.userId);
  const email = user?.email?.trim().toLowerCase() || "";
  const assigned = (moderator.assignedUserEmails || []).map((e) => e.trim().toLowerCase());
  if (!email || !assigned.includes(email)) {
    return NextResponse.json(
      { error: "This intake is not for one of your assigned members." },
      { status: 403 }
    );
  }

  const result = await produceLgdCgmrForIntake({
    intakeId: parsed.data.intakeId,
    mode: parsed.data.mode,
    audioUrl: parsed.data.audioUrl,
    scriptOverride: parsed.data.scriptOverride
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({
    ok: true,
    libraryItemId: result.libraryItemId,
    audioUrl: result.audioUrl,
    voiceLabel: result.voiceLabel,
    bedPath: result.bedPath,
    bedNote: result.bedNote,
    regenerated: result.regenerated
  });
}
