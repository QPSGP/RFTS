import { NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { getUserSessionEmail } from "@/lib/user-auth";
import { getPlaybackSettings, getUserProfile, listLibrary } from "@/lib/db";
import { buildSchedulePreview } from "@/lib/scheduler";

const schema = z.object({
  nights: z.number().int().min(1).max(30).optional()
});

const dataDir = path.join(process.cwd(), "data");
const PREP_AUDIO_NAME = "RFTS_starting_music.mp3";

const readJson = <T>(fileName: string, fallback: T): T => {
  const filePath = path.join(dataDir, fileName);
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw) {
    return fallback;
  }
  return JSON.parse(raw) as T;
};

export async function GET(request: Request) {
  const email = getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (profile.subscriptionStatus !== "active") {
    return NextResponse.json({ error: "Subscription required." }, { status: 403 });
  }
  const url = new URL(request.url);
  const nightsRaw = url.searchParams.get("nights");
  const parsed = schema.safeParse({
    nights: nightsRaw ? Number(nightsRaw) : undefined
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const nights = parsed.data.nights ?? 7;
  const [library, settings] = await Promise.all([
    listLibrary(),
    getPlaybackSettings()
  ]);
  const schedule = buildSchedulePreview({
    interests: profile.goalIds || [],
    library,
    settings,
    tier: profile.subscriptionTier || "bronze",
    nights,
    playsPerNight: profile.playsPerNight === 1 ? 1 : 2
  });
  const blobAssets = readJson<{ audios?: Record<string, string> }>(
    "blob-assets.json",
    {}
  );
  const prepAudioUrl = blobAssets.audios?.[PREP_AUDIO_NAME] || "";
  return NextResponse.json({
    schedule,
    nights,
    playsPerNight: profile.playsPerNight === 1 ? 1 : 2,
    gapHours: settings.nightlyGapHours,
    prepAudio: prepAudioUrl
      ? { title: "Preparation Audio", url: prepAudioUrl }
      : null
  });
}
