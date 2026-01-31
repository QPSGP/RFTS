import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { getPlaybackSettings, listLibrary } from "@/lib/db";
import { buildSchedulePreview } from "@/lib/scheduler";

const schema = z.object({
  interests: z.array(z.string()).min(1),
  tier: z.enum(["bronze", "gold", "platinum"]).default("bronze"),
  nights: z.number().int().min(1).max(30).default(14)
});

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const library = await listLibrary();
  const settings = await getPlaybackSettings();
  const schedule = buildSchedulePreview({
    interests: parsed.data.interests,
    library,
    settings,
    tier: parsed.data.tier,
    nights: parsed.data.nights
  });

  return NextResponse.json({ schedule });
}
