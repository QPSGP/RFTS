import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { getPlaybackSettings, savePlaybackSettings } from "@/lib/db";

const schema = z.object({
  playsPerRecording: z.number().int().min(1).max(365),
  nightlyGapHours: z.number().min(0).max(12),
  addNewTrackEveryNights: z.number().int().min(1).max(30),
  initialTracks: z.number().int().min(1).max(10),
  cgmrTrackId: z.string().optional().default(""),
  fallbackTrackId: z.string().optional().default("T-18")
});

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ settings: await getPlaybackSettings() });
}

export async function PUT(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  await savePlaybackSettings(parsed.data);
  return NextResponse.json({ ok: true });
}
