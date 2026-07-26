import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { isOpenAiTtsConfigured, produceLgdCgmrForIntake } from "@/lib/lgd-cgmr-produce";

const bodySchema = z.object({
  intakeId: z.string().uuid(),
  mode: z.enum(["generate", "assign"]),
  audioUrl: z.string().url().optional(),
  scriptOverride: z.string().optional()
});

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({
    aiGenerateAvailable: isOpenAiTtsConfigured()
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
  if (parsed.data.mode === "assign" && !parsed.data.audioUrl) {
    return NextResponse.json({ error: "audioUrl is required for assign mode." }, { status: 400 });
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
