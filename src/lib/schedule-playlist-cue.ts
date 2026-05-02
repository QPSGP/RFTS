/** Nights returned from `/api/user/schedule` (tracks subset is enough for cue building). */
export type ScheduleNightForCue = {
  night: number;
  tracks: { id: string; title: string; skuCode?: string }[];
};

export type PlaylistCueItem = { id: string; title: string; skuCode?: string };

/**
 * Next plays in calendar order starting at currentNight, flattened across nights (managed rotation may repeat IDs).
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
