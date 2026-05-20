import { buildNextPlaylistCue, type PlaylistCueItem, type ScheduleNightForCue } from "@/lib/schedule-progress";
import type { PlaysPerNightSetting } from "@/lib/session-progress-format";

export type { PlaylistCueItem, ScheduleNightForCue } from "@/lib/schedule-progress";

/**
 * Next plays starting at currentNight (legacy: first track of that schedule night).
 * Prefer {@link buildNextPlaylistCue} with completed main-play count for accurate cues.
 */
export function buildPlaylistCueFromSchedule(
  schedule: ScheduleNightForCue[],
  currentNight: number,
  maxItems: number
): PlaylistCueItem[] {
  if (!schedule.length || maxItems <= 0) return [];
  const startIndex = schedule.findIndex((n) => n.night === currentNight);
  const fromTonight =
    startIndex >= 0 ? [...schedule.slice(startIndex), ...schedule.slice(0, startIndex)] : schedule;
  const cue: PlaylistCueItem[] = [];
  for (const night of fromTonight) {
    for (const track of night.tracks) {
      cue.push({ id: track.id, title: track.title, skuCode: track.skuCode });
      if (cue.length >= maxItems) return cue;
    }
  }
  return cue;
}

/** Client/server helper: next cue from stored progress and audios-per-night setting. */
export function buildPlaylistCueFromProgress(
  schedule: ScheduleNightForCue[],
  completedScheduleNights: number,
  playsPerNight: PlaysPerNightSetting,
  maxItems: number
): PlaylistCueItem[] {
  return buildNextPlaylistCue(schedule, completedScheduleNights, playsPerNight, maxItems);
}
