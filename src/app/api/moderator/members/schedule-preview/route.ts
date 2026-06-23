import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ensureMemberScheduleProgressMigrated,
  getMemberAudioOrder,
  getMemberProfileByUserId,
  getPlaybackSettings,
  getUserByEmail,
  getUserProfile,
  listInterests,
  listLibrary
} from "@/lib/db";
import { requireActiveModerator } from "@/lib/moderator-member-access";
import {
  completedMainAudiosPlayed,
  minScheduleNightsForCue,
  resolveCurrentScheduleNight
} from "@/lib/schedule-progress";
import { buildSchedulePreview } from "@/lib/scheduler";

const querySchema = z.object({
  email: z.string().email(),
  nights: z.string().optional()
});

export async function GET(request: Request) {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    email: url.searchParams.get("email"),
    nights: url.searchParams.get("nights")
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const normalized = parsed.data.email.trim().toLowerCase();
  const allowed = moderator.assignedUserEmails.map((e) => e.trim().toLowerCase());
  if (!allowed.includes(normalized)) {
    return NextResponse.json({ error: "This member is not assigned to you." }, { status: 403 });
  }

  const memberEmail = normalized;
  const user = await getUserByEmail(memberEmail);
  if (!user) {
    return NextResponse.json({ error: "Member not registered yet." }, { status: 404 });
  }

  const profile = await getUserProfile(memberEmail);
  if (!profile) {
    return NextResponse.json({ error: "Member profile not found." }, { status: 404 });
  }

  const isManaged = profile.subscriptionTier === "platinum_managed";
  const goalIds = profile.goalIds ?? [];
  const assignedAudioOrder = isManaged ? await getMemberAudioOrder(memberEmail) : [];
  const assignedAudioIds =
    isManaged && assignedAudioOrder.length > 0 ? assignedAudioOrder : undefined;

  if (isManaged && !assignedAudioIds?.length) {
    return NextResponse.json({
      schedule: [],
      message: "No rotation steps yet — add recordings in Rotation order for this member.",
      tier: "platinum_managed",
      playsPerNight: profile.playsPerNight === 1 ? 1 : 2,
      goalCount: 0,
      rotationStepCount: 0,
      completedScheduleNights: 0,
      currentNight: 1
    });
  }

  if (!isManaged && goalIds.length === 0) {
    return NextResponse.json({
      schedule: [],
      message: "No goals assigned yet — add goals to preview the nightly lineup.",
      tier: "platinum",
      playsPerNight: profile.playsPerNight === 1 ? 1 : 2,
      goalCount: 0,
      rotationStepCount: 0,
      completedScheduleNights: 0,
      currentNight: 1
    });
  }

  let nights = 14;
  if (parsed.data.nights) {
    const n = parseInt(parsed.data.nights, 10);
    if (Number.isFinite(n)) nights = Math.min(42, Math.max(1, n));
  }

  const playsPerNight = profile.playsPerNight === 1 ? 1 : 2;
  const memberProfileRow = await getMemberProfileByUserId(user.id);
  let completedNights = Math.max(0, memberProfileRow?.completedScheduleNights ?? 0);
  completedNights = await ensureMemberScheduleProgressMigrated(user.id, playsPerNight);

  const [library, settings, interestRecords] = await Promise.all([
    listLibrary(),
    getPlaybackSettings(),
    listInterests()
  ]);

  const previewLength = nights;
  let buildNights = Math.min(
    366,
    Math.max(previewLength, minScheduleNightsForCue(completedNights, 2, previewLength * 2))
  );

  const scheduleInput = {
    interests: goalIds,
    library,
    interestRecords,
    settings,
    tier: (isManaged ? "platinum_managed" : "platinum") as "platinum" | "platinum_managed",
    playsPerNight: 2 as const,
    assignedAudioIds
  };

  let scheduleBuilt = buildSchedulePreview({ ...scheduleInput, nights: buildNights });
  let startScheduleNight = Math.min(
    366,
    Math.max(1, resolveCurrentScheduleNight(scheduleBuilt, completedNights, playsPerNight))
  );

  while (startScheduleNight + previewLength - 1 > buildNights && buildNights < 366) {
    buildNights = Math.min(366, startScheduleNight + previewLength);
    scheduleBuilt = buildSchedulePreview({ ...scheduleInput, nights: buildNights });
    startScheduleNight = Math.min(
      366,
      Math.max(1, resolveCurrentScheduleNight(scheduleBuilt, completedNights, playsPerNight))
    );
  }

  const upcoming = scheduleBuilt
    .filter((night) => night.night >= startScheduleNight)
    .slice(0, previewLength);

  const schedule = upcoming.map((night, index) => ({
    night: index + 1,
    scheduleNight: night.night,
    note: night.note,
    rotationAdded: night.rotationAdded,
    rotationSessionDrop: night.rotationSessionDrop,
    rotationRemovedAfterPlays: night.rotationRemovedAfterPlays,
    tracks: night.tracks.map((track) => ({
      id: track.id,
      title: track.title,
      skuCode: track.skuCode ?? undefined
    }))
  }));

  return NextResponse.json({
    schedule,
    nights: previewLength,
    tier: isManaged ? "platinum_managed" : "platinum",
    goalCount: goalIds.length,
    rotationStepCount: assignedAudioIds?.length ?? 0,
    playsPerNight,
    completedScheduleNights: completedNights,
    completedMainAudios: completedMainAudiosPlayed(completedNights),
    currentNight: startScheduleNight,
    startScheduleNight
  });
}
