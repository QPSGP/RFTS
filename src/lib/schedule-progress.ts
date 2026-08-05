import type { PlaysPerNightSetting } from "@/lib/session-progress-format";
import { SCHEDULE_MAX_MAIN_AUDIOS } from "@/lib/schedule-limits";

export type ScheduleNightForCue = {
  night: number;
  tracks: { id: string; title: string; skuCode?: string }[];
};

export type PlaylistCueItem = { id: string; title: string; skuCode?: string };

/** `member_profiles.schedule_progress_model`: 0 = legacy schedule-night index, 1 = main audios played. */
export const SCHEDULE_PROGRESS_MODEL_MAIN_AUDIOS = 1;

/**
 * Main goal audios finished (stored in `completed_schedule_nights` when model = 1).
 * Same count whether the member uses 1 or 2 audios per night - switching mode does not change position.
 */
export function completedMainAudiosPlayed(storedCompleted: number): number {
  return Math.max(0, Math.floor(storedCompleted));
}

/** One-time conversion from legacy stored schedule-night index to main audios played. */
export function legacyStoredProgressToMainAudios(
  storedCompleted: number,
  playsPerNight: PlaysPerNightSetting
): number {
  const n = Math.max(0, Math.floor(storedCompleted));
  if (n === 0) return 0;
  if (playsPerNight === 1) return n;
  return Math.min(SCHEDULE_MAX_MAIN_AUDIOS, n * 2);
}

/** @deprecated Use completedMainAudiosPlayed - kept for callers passing playsPerNight (ignored). */
export function completedNightsToMainPlaysDone(
  completedScheduleNights: number,
  _playsPerNight?: PlaysPerNightSetting
): number {
  return completedMainAudiosPlayed(completedScheduleNights);
}

/** Schedule night that contains the next main play (for current lineup). */
export function resolveCurrentScheduleNight(
  schedule: ScheduleNightForCue[],
  completedMainAudios: number,
  _playsPerNight?: PlaysPerNightSetting
): number {
  if (!schedule.length) return 1;
  const mainPlaysDone = completedMainAudiosPlayed(completedMainAudios);
  let played = 0;
  for (const night of schedule) {
    const count = night.tracks.length;
    if (played + count > mainPlaysDone) return night.night;
    played += count;
  }
  return schedule[schedule.length - 1]!.night;
}

/** Flat main-play order (always build schedule with 2 plays per night for this). */
export function flattenScheduleMainPlays(schedule: ScheduleNightForCue[]): PlaylistCueItem[] {
  const flat: PlaylistCueItem[] = [];
  for (const night of schedule) {
    for (const track of night.tracks) {
      flat.push({ id: track.id, title: track.title, skuCode: track.skuCode });
    }
  }
  return flat;
}

/**
 * Tracks for the member's current session lineup.
 * Schedule preview is always built at 2/night; 1/night members get the single next main play only.
 */
export function getMemberTonightTrackItems(
  schedule: ScheduleNightForCue[],
  completedMainAudios: number,
  playsPerNight: PlaysPerNightSetting
): PlaylistCueItem[] {
  if (!schedule.length) return [];
  const completed = completedMainAudiosPlayed(completedMainAudios);
  if (playsPerNight === 1) {
    const flat = flattenScheduleMainPlays(schedule);
    if (!flat.length) return [];
    return [flat[completed % flat.length]!];
  }
  const nightNum = resolveCurrentScheduleNight(schedule, completedMainAudios, 2);
  const night = schedule.find((n) => n.night === nightNum);
  if (!night?.tracks.length) {
    const flat = flattenScheduleMainPlays(schedule);
    return flat.length ? [flat[completed % flat.length]!] : [];
  }
  return night.tracks.map((t) => ({
    id: t.id,
    title: t.title,
    skuCode: t.skuCode
  }));
}

/** Minimum schedule nights to build (canonical 2 main plays per schedule night). */
export function minScheduleNightsForCue(
  completedMainAudios: number,
  _playsPerNight?: PlaysPerNightSetting,
  cueLength: number = 10
): number {
  const skip = completedMainAudiosPlayed(completedMainAudios);
  return Math.ceil((skip + cueLength) / 2);
}

/**
 * Next plays in rotation order, skipping finished main plays.
 * Wraps at the end of the built schedule so callers always get up to `maxItems` (e.g. 10).
 */
export function buildNextPlaylistCue(
  schedule: ScheduleNightForCue[],
  completedMainAudios: number,
  _playsPerNight?: PlaysPerNightSetting,
  maxItems: number = 10
): PlaylistCueItem[] {
  if (!schedule.length || maxItems <= 0) return [];
  const skip = completedMainAudiosPlayed(completedMainAudios);
  const flat = flattenScheduleMainPlays(schedule);
  if (!flat.length) return [];
  const cue: PlaylistCueItem[] = [];
  for (let i = 0; i < maxItems; i++) {
    cue.push(flat[(skip + i) % flat.length]!);
  }
  return cue;
}
