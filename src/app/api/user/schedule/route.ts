import { NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { getUserSessionEmail } from "@/lib/user-auth";
import {
  getMemberAudioOrder,
  getMemberProfileByUserId,
  getPlaybackSettings,
  getUserProfile,
  listInterests,
  listLibrary,
  setScheduleStartedToToday,
  trySeedCompletedNightsFromLegacySessions
} from "@/lib/db";
import { buildSchedulePreview } from "@/lib/scheduler";
import {
  buildNextPlaylistCue,
  minScheduleNightsForCue,
  resolveCurrentScheduleNight
} from "@/lib/schedule-progress";

const schema = z.object({
  /** Preview length; server extends this when the member has passed more nights than requested (see currentNight). */
  nights: z.number().int().min(1).max(366).optional()
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
  const requestedNights = parsed.data.nights ?? 7;
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

  // Only Platinum Managed use assigned-audio schedule; Platinum = goal-based
  const isPlatinumManaged = profile.subscriptionTier === "platinum_managed";
  const assignedAudioOrder = isPlatinumManaged ? await getMemberAudioOrder(profile.email || "") : [];
  const assignedAudioIds = isPlatinumManaged && assignedAudioOrder.length > 0 ? assignedAudioOrder : undefined;

  /**
   * "Special" slot (every 4th session): CGMR assigned to this member, else global playback CGMR or fallback (e.g. T-18).
   * For Platinum Managed with an assigned-audio list, do NOT treat the first library row that has their email on
   * allowedUserEmails as special — that was stealing the slot from T-18 when they had no CGMR.
   */
  const cgmrForMember =
    filteredLibrary.find(
      (item) =>
        (item.allowedUserEmails || []).some((e) => e.toLowerCase() === emailLower) &&
        hasCategory(item, "cgmr")
    ) ?? null;
  const anyAllowListMatch =
    filteredLibrary.find((item) =>
      (item.allowedUserEmails || []).some((e) => e.toLowerCase() === emailLower)
    ) ?? null;
  const userAssignedTrack =
    cgmrForMember ??
    (assignedAudioIds?.length ? null : anyAllowListMatch);

  // "Tonight" = next night after fully completed listening nights (stored), not calendar days.
  const startedAtRaw = memberProfile?.scheduleStartedAt;
  let completedNights = Math.max(0, memberProfile?.completedScheduleNights ?? 0);
  if (startedAtRaw && completedNights === 0) {
    const dateStr = String(startedAtRaw).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      completedNights = await trySeedCompletedNightsFromLegacySessions(profile.id, dateStr);
    }
  }
  const playsPerNight = profile.playsPerNight === 1 ? 1 : 2;
  const maxBuildNights = 366;
  const cueLength = 10;
  const nights = Math.min(
    maxBuildNights,
    Math.max(
      requestedNights,
      Math.max(1, completedNights + 1),
      minScheduleNightsForCue(completedNights, playsPerNight, cueLength)
    )
  );

  const schedule = buildSchedulePreview({
    interests: profile.goalIds || [],
    library: filteredLibrary,
    interestRecords,
    settings,
    tier: profile.subscriptionTier || "platinum",
    nights,
    playsPerNight,
    userAssignedTrack: userAssignedTrack ?? undefined,
    assignedAudioIds
  });

  const currentNight = Math.min(
    maxBuildNights,
    Math.max(1, resolveCurrentScheduleNight(schedule, completedNights, playsPerNight))
  );

  if (currentNight === 1 && !startedAtRaw) {
    await setScheduleStartedToToday(profile.id);
  }

  const nextInCue = buildNextPlaylistCue(schedule, completedNights, playsPerNight, cueLength);

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
    completedScheduleNights: completedNights,
    nights,
    playsPerNight,
    gapHours: settings.nightlyGapHours,
    prepAudio,
    fallbackTrack: fallbackTrackSummary,
    nextInCue
  });
}
