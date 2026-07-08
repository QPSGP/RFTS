/** User-facing name for the session-opening track (RFTS_starting_music.mp3). */
export const INTRO_RELAXATION_MUSIC_LABEL = "Intro relaxation music";

/** Legacy activity-log label — still parsed for older member sessions. */
export const LEGACY_PREPARATION_AUDIO_LOG_LABEL = "Preparation audio";

export function isIntroRelaxationMusicLogLabel(label: string): boolean {
  const t = label.trim();
  return (
    t.toLowerCase() === INTRO_RELAXATION_MUSIC_LABEL.toLowerCase() ||
    t.toLowerCase() === LEGACY_PREPARATION_AUDIO_LOG_LABEL.toLowerCase()
  );
}
