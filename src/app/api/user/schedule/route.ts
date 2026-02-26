import { NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { getUserSessionEmail } from "@/lib/user-auth";
import { getMemberProfileByUserId, getPlaybackSettings, getUserProfile, listInterests, listLibrary, setScheduleStartedToToday } from "@/lib/db";
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
  const [library, settings, interestRecords, memberProfile] = await Promise.all([
    listLibrary(),
    getPlaybackSettings(),
    listInterests(),
    getMemberProfileByUserId(profile.id)
  ]);

  const yearBorn = memberProfile?.yearBorn ?? null;
  const hasVerifiedAge = yearBorn != null && new Date().getFullYear() - yearBorn >= 18;
  const canAccessAdult = (memberProfile?.adultConsent ?? false) && hasVerifiedAge;
  const wantsPracticeGrowth = memberProfile?.wantsPracticeGrowth ?? false;

  const hasCategory = (item: { categories?: string[] }, cat: string) =>
    (item.categories || []).some((c) => c.toLowerCase() === cat.toLowerCase());
  const filteredLibrary = library.filter((item) => {
    if (item.isAdult && !canAccessAdult) return false;
    if (hasCategory(item, "special") && !wantsPracticeGrowth) return false;
    return true;
  });

  const emailLower = profile.email?.toLowerCase() ?? "";
  const userAssignedTrack =
    filteredLibrary.find(
      (item) =>
        (item.allowedUserEmails || []).some((e) => e.toLowerCase() === emailLower) &&
        hasCategory(item, "cgmr")
    ) ??
    filteredLibrary.find((item) => (item.allowedUserEmails || []).some((e) => e.toLowerCase() === emailLower)) ??
    null;

  const schedule = buildSchedulePreview({
    interests: profile.goalIds || [],
    library: filteredLibrary,
    interestRecords,
    settings,
    tier: profile.subscriptionTier || "platinum",
    nights,
    playsPerNight: profile.playsPerNight === 1 ? 1 : 2,
    userAssignedTrack: userAssignedTrack ?? undefined
  });

  // Advance "tonight" by day: use schedule_started_at so night 1 = start date, night 2 = next day, etc.
  let currentNight = 1;
  if (memberProfile && memberProfile.scheduleStartedAt) {
    const started = new Date(memberProfile.scheduleStartedAt + "Z");
    const today = new Date();
    const startedDate = new Date(Date.UTC(started.getUTCFullYear(), started.getUTCMonth(), started.getUTCDate()));
    const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const diffMs = todayDate.getTime() - startedDate.getTime();
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    currentNight = Math.max(1, Math.min(nights, days + 1));
  } else if (memberProfile) {
    await setScheduleStartedToToday(profile.id);
    currentNight = 1;
  }

  const blobAssets = readJson<{ audios?: Record<string, string> }>(
    "blob-assets.json",
    {}
  );
  const hasPrep = !!blobAssets.audios?.[PREP_AUDIO_NAME];
  const prepAudio = hasPrep
    ? { title: "Preparation Audio", url: "/api/stream/audio?prep=1" }
    : null;
  const scheduleWithStreamUrls = schedule.map((night) => ({
    ...night,
    tracks: night.tracks.map((track) => ({
      id: track.id,
      title: track.title,
      audioUrl: `/api/stream/audio?id=${track.id}`
    }))
  }));
  return NextResponse.json({
    schedule: scheduleWithStreamUrls,
    currentNight,
    nights,
    playsPerNight: profile.playsPerNight === 1 ? 1 : 2,
    gapHours: settings.nightlyGapHours,
    prepAudio
  });
}
