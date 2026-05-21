import type { PlaysPerNightSetting } from "@/lib/session-progress-format";

export type ScheduleNightForCue = {
  night: number;
  tracks: { id: string; title: string; skuCode?: string }[];
};

export type PlaylistCueItem = { id: string; title: string; skuCode?: string };

/** `member_profiles.schedule_progress_model`: 0 = legacy schedule-night index, 1 = main audios played. */
export const SCHEDULE_PROGRESS_MODEL_MAIN_AUDIOS = 1;

/**
 * Main goal audios finished (stored in `completed_schedule_nights` when model = 1).
 * Same count whether the member uses 1 or 2 audios per night — switching mode does not change position.
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
  return Math.min(366 * 2, n * 2);
}

/** @deprecated Use completedMainAudiosPlayed — kept for callers passing playsPerNight (ignored). */
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

/** Minimum schedule nights to build so the rotation has enough future main plays (before wrap). */
export function minScheduleNightsForCue(
  completedMainAudios: number,
  playsPerNight: PlaysPerNightSetting,
  cueLength: number
): number {
  const skip = completedMainAudiosPlayed(completedMainAudios);
  return Math.ceil((skip + cueLength) / playsPerNight);
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
  const flat: PlaylistCueItem[] = [];
  for (const night of schedule) {
    for (const track of night.tracks) {
      flat.push({ id: track.id, title: track.title, skuCode: track.skuCode });
    }
  }
  if (!flat.length) return [];
  const cue: PlaylistCueItem[] = [];
  for (let i = 0; i < maxItems; i++) {
    cue.push(flat[(skip + i) % flat.length]!);
  }
  return cue;
}
