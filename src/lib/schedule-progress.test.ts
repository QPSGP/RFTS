import { buildSchedulePreview } from "./scheduler";
import type { LibraryItem, PlaybackSettings } from "./types";
import {
  buildNextPlaylistCue,
  convertCompletedNightsForPlaysPerNightChange,
  completedNightsToMainPlaysDone
} from "./schedule-progress";

const mk = (id: string, title: string, sku?: string): LibraryItem => ({
  id,
  title,
  description: "",
  coverUrl: "",
  audioUrl: `https://example.com/${id}.mp3`,
  interestIds: [],
  skuCode: sku,
  createdAt: "",
  order: 0
});

describe("schedule progress / playlist cue", () => {
  const settings: PlaybackSettings = {
    playsPerRecording: 21,
    nightlyGapHours: 2.5,
    addNewTrackEveryNights: 99,
    initialTracks: 3,
    cgmrTrackId: "",
    fallbackTrackId: "T-18"
  };

  const library = [
    mk("t26", "T-26", "T-26"),
    mk("t36", "T-36", "T-36"),
    mk("s01", "S-01 C", "S-01 C"),
    mk("t18", "T-18", "T-18")
  ];

  it("places T-18 as 4th main play in next cue after one full 2-audio night", () => {
    const schedule = buildSchedulePreview({
      interests: [],
      library,
      settings,
      tier: "platinum_managed",
      nights: 6,
      playsPerNight: 2,
      assignedAudioIds: ["t26", "t36", "s01"]
    });
    expect(completedNightsToMainPlaysDone(1, 2)).toBe(2);
    const cue = buildNextPlaylistCue(schedule, 1, 2, 10);
    expect(cue.slice(0, 4).map((t) => t.id)).toEqual(["s01", "t18", "t26", "t36"]);
    expect(cue[1]?.id).toBe("t18");
  });

  it("converts completed nights when switching audios-per-night mode", () => {
    expect(convertCompletedNightsForPlaysPerNightChange(3, 2, 1)).toBe(6);
    expect(convertCompletedNightsForPlaysPerNightChange(6, 1, 2)).toBe(3);
  });
});
