import { NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { getUserSessionEmail } from "@/lib/user-auth";
import { getMemberAudioOrder, getMemberProfileByUserId, getPlaybackSettings, getUserProfile, listInterests, listLibrary, setScheduleStartedToToday } from "@/lib/db";
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
  const email = await getUserSessionEmail();
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

  const yearBornRaw = memberProfile?.yearBorn ?? null;
  const yearBorn =
    yearBornRaw != null
      ? typeof yearBornRaw === "number"
        ? yearBornRaw
        : parseInt(String(yearBornRaw), 10)
      : null;
  const yearBornNum =
    yearBorn != null && !Number.isNaN(yearBorn) && yearBorn >= 1900 && yearBorn <= 2100
      ? yearBorn
      : null;
  const hasVerifiedAge =
    yearBornNum != null && new Date().getFullYear() - yearBornNum >= 18;
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

  // Only Platinum Managed use assigned-audio schedule; Platinum = goal-based
  const isPlatinumManaged = profile.subscriptionTier === "platinum_managed";
  const assignedAudioOrder = isPlatinumManaged ? await getMemberAudioOrder(profile.email || "") : [];
  const assignedAudioIds = isPlatinumManaged && assignedAudioOrder.length > 0 ? assignedAudioOrder : undefined;

  const schedule = buildSchedulePreview({
    interests: profile.goalIds || [],
    library: filteredLibrary,
    interestRecords,
    settings,
    tier: profile.subscriptionTier || "platinum",
    nights,
    playsPerNight: profile.playsPerNight === 1 ? 1 : 2,
    userAssignedTrack: userAssignedTrack ?? undefined,
    assignedAudioIds
  });

  // Advance "tonight" by day: use schedule_started_at (UTC) so night 1 = start date, night 2 = next day, etc.
  let currentNight = 1;
  const startedAtRaw = memberProfile?.scheduleStartedAt;
  if (startedAtRaw) {
    const str = String(startedAtRaw).trim();
    const started = str.includes("T") ? new Date(str) : new Date(str + "T00:00:00Z");
    if (!Number.isNaN(started.getTime())) {
      const startedDate = new Date(Date.UTC(started.getUTCFullYear(), started.getUTCMonth(), started.getUTCDate()));
      const now = new Date();
      const todayDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const diffMs = todayDate.getTime() - startedDate.getTime();
      const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      currentNight = Math.max(1, Math.min(nights, days + 1));
    }
  }
  if (currentNight === 1 && !startedAtRaw) {
    await setScheduleStartedToToday(profile.id);
  }

  // One session = 2 audios (whether 2 per night or 1 per night over two nights). Build enough nights for 60 sessions.
  const playsPerNight = profile.playsPerNight === 1 ? 1 : 2;
  const cueSessions = 60;
  const cueNights = playsPerNight === 2 ? cueSessions : cueSessions * 2;
  const scheduleForCue = buildSchedulePreview({
    interests: profile.goalIds || [],
    library: filteredLibrary,
    interestRecords,
    settings,
    tier: profile.subscriptionTier || "platinum",
    nights: cueNights,
    playsPerNight,
    userAssignedTrack: userAssignedTrack ?? undefined,
    assignedAudioIds,
    initialTracksOverride: 11
  });
  const cueStartIndex = scheduleForCue.findIndex((n) => n.night === Math.min(currentNight, cueNights));
  const cueFromTonight =
    cueStartIndex >= 0
      ? [...scheduleForCue.slice(cueStartIndex), ...scheduleForCue.slice(0, cueStartIndex)]
      : scheduleForCue;
  // Next 10 plays in order (so T-18/CGMR appears in 4th and 8th slot, etc.)
  const nextInCue: { id: string; title: string; skuCode?: string }[] = [];
  for (const night of cueFromTonight) {
    for (const track of night.tracks) {
      nextInCue.push({
        id: track.id,
        title: track.title,
        skuCode: track.skuCode ?? undefined
      });
      if (nextInCue.length >= 10) break;
    }
    if (nextInCue.length >= 10) break;
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
      skuCode: track.skuCode ?? undefined,
      audioUrl: `/api/stream/audio?id=${track.id}`
    }))
  }));

  // For non-managed members, include default fallback (e.g. T-18) so the weekly lineup UI can show it
  const isPlatinumNonManaged = profile.subscriptionTier !== "platinum_managed";
  const fallbackCode = (settings.fallbackTrackId || "T-18").trim().toUpperCase();
  const fallbackTrack =
    isPlatinumNonManaged && fallbackCode
      ? filteredLibrary.find(
          (item) =>
            (item.skuCode || "").toUpperCase().includes(fallbackCode) ||
            (item.title || "").toUpperCase().includes(fallbackCode)
        ) ?? null
      : null;
  const fallbackTrackSummary =
    fallbackTrack ?
      { id: fallbackTrack.id, title: fallbackTrack.title, skuCode: fallbackTrack.skuCode ?? undefined }
      : undefined;

  return NextResponse.json({
    schedule: scheduleWithStreamUrls,
    currentNight,
    nights,
    playsPerNight: profile.playsPerNight === 1 ? 1 : 2,
    gapHours: settings.nightlyGapHours,
    prepAudio,
    fallbackTrack: fallbackTrackSummary,
    nextInCue
  });
}
