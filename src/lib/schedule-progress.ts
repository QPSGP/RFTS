import type { PlaysPerNightSetting } from "@/lib/session-progress-format";

export type ScheduleNightForCue = {
  night: number;
  tracks: { id: string; title: string; skuCode?: string }[];
};

export type PlaylistCueItem = { id: string; title: string; skuCode?: string };

/** Main plays finished (each first/second slot when 2/night; one per schedule night when 1/night). */
export function completedNightsToMainPlaysDone(
  completedScheduleNights: number,
  playsPerNight: PlaysPerNightSetting
): number {
  const n = Math.max(0, Math.floor(completedScheduleNights));
  return n * playsPerNight;
}

/** Keep the same listening position when switching audios-per-night mode. */
export function convertCompletedNightsForPlaysPerNightChange(
  completed: number,
  from: PlaysPerNightSetting,
  to: PlaysPerNightSetting
): number {
  const c = Math.max(0, Math.min(366, Math.floor(completed)));
  if (from === to) return c;
  if (from === 2 && to === 1) return Math.min(366, c * 2);
  return Math.min(366, Math.floor(c / 2));
}

/** Schedule night that contains the next main play (for tonight's lineup). */
export function resolveCurrentScheduleNight(
  schedule: ScheduleNightForCue[],
  completedScheduleNights: number,
  playsPerNight: PlaysPerNightSetting
): number {
  if (!schedule.length) return 1;
  const mainPlaysDone = completedNightsToMainPlaysDone(completedScheduleNights, playsPerNight);
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
  completedScheduleNights: number,
  playsPerNight: PlaysPerNightSetting,
  cueLength: number
): number {
  const skip = completedNightsToMainPlaysDone(completedScheduleNights, playsPerNight);
  return Math.ceil((skip + cueLength) / playsPerNight);
}

/**
 * Next plays in rotation order, skipping finished main plays.
 * Wraps at the end of the built schedule so callers always get up to `maxItems` (e.g. 10).
 */
export function buildNextPlaylistCue(
  schedule: ScheduleNightForCue[],
  completedScheduleNights: number,
  playsPerNight: PlaysPerNightSetting,
  maxItems: number
): PlaylistCueItem[] {
  if (!schedule.length || maxItems <= 0) return [];
  const skip = completedNightsToMainPlaysDone(completedScheduleNights, playsPerNight);
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
