import { buildSchedulePreview } from "./scheduler";
import type { LibraryItem, PlaybackSettings } from "./types";
import {
  buildNextPlaylistCue,
  completedMainAudiosPlayed,
  completedNightsToMainPlaysDone,
  getMemberTonightTrackItems
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
    expect(completedMainAudiosPlayed(2)).toBe(2);
    const cue = buildNextPlaylistCue(schedule, 2, 2, 10);
    expect(cue.slice(0, 4).map((t) => t.id)).toEqual(["s01", "t18", "t26", "t36"]);
    expect(cue[1]?.id).toBe("t18");
  });

  it("completed main audios is unchanged when plays-per-night label changes (same stored count)", () => {
    expect(completedNightsToMainPlaysDone(5, 2)).toBe(5);
    expect(completedNightsToMainPlaysDone(5, 1)).toBe(5);
  });

  it("always returns 10 cue items by wrapping the rotation", () => {
    const schedule = buildSchedulePreview({
      interests: [],
      library,
      settings,
      tier: "platinum_managed",
      nights: 3,
      playsPerNight: 2,
      assignedAudioIds: ["t26", "t36", "s01"]
    });
    const cue = buildNextPlaylistCue(schedule, 2, 2, 10);
    expect(cue).toHaveLength(10);
  });

  it("same completed main audios yields the same next track when plays per night changes", () => {
    const base = {
      interests: [] as string[],
      library,
      settings,
      tier: "platinum_managed" as const,
      nights: 8,
      assignedAudioIds: ["t26", "t36", "s01"]
    };
    const at2 = buildSchedulePreview({ ...base, playsPerNight: 2 });
    const at1 = buildSchedulePreview({ ...base, playsPerNight: 1 });
    const completed = 2;
    expect(buildNextPlaylistCue(at2, completed, 2, 1)[0]?.id).toBe(
      buildNextPlaylistCue(at1, completed, 1, 1)[0]?.id
    );
  });

  it("full next-10 cue is unchanged when toggling 1 vs 2 per night if schedule is built at 2/night", () => {
    const base = {
      interests: [] as string[],
      library,
      settings,
      tier: "platinum_managed" as const,
      nights: 21,
      assignedAudioIds: ["t26", "t36", "s01"]
    };
    const canonical = buildSchedulePreview({ ...base, playsPerNight: 2 });
    const completed = 10;
    const at2 = buildNextPlaylistCue(canonical, completed, 2, 10).map((t) => t.id);
    const at1 = buildNextPlaylistCue(canonical, completed, 1, 10).map((t) => t.id);
    expect(at1).toEqual(at2);
  });

  it("tonight lineup includes both plays when the same id appears twice in one schedule night", () => {
    const schedule = [
      {
        night: 1,
        tracks: [
          { id: "dup", title: "Same", skuCode: "T-01" },
          { id: "dup", title: "Same", skuCode: "T-01" }
        ]
      }
    ];
    const tonight = getMemberTonightTrackItems(schedule, 0, 2);
    expect(tonight).toHaveLength(2);
    expect(tonight.map((t) => t.id)).toEqual(["dup", "dup"]);
  });
});
