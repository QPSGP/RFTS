import { buildSchedulePreview } from "./scheduler";
import type { LibraryItem, PlaybackSettings } from "./types";

const mk = (id: string, title: string): LibraryItem => ({
  id,
  title,
  description: "",
  coverUrl: "",
  audioUrl: `https://example.com/${id}.mp3`,
  interestIds: [],
  createdAt: "",
  order: 0
});

describe("buildSchedulePreview — managed assigned order", () => {
  const settings: PlaybackSettings = {
    playsPerRecording: 21,
    nightlyGapHours: 2.5,
    addNewTrackEveryNights: 99,
    initialTracks: 3,
    cgmrTrackId: "",
    fallbackTrackId: "T-18"
  };

  const t18 = mk("t18", "T-18 Abundance");
  const t26 = mk("t26", "T-26");
  const t36 = mk("t36", "T-36");
  const s01 = mk("s01", "S-01 C");
  const t23 = mk("t23", "T-23");
  const library = [t26, t36, s01, t23, t18];

  it("keeps three assigned priorities in rotation when initialTracks is still 3 (legacy DB)", () => {
    const nights = buildSchedulePreview({
      interests: [],
      library,
      settings,
      tier: "platinum_managed",
      nights: 6,
      playsPerNight: 2,
      assignedAudioIds: ["t26", "t36", "s01", "t23"]
    });

    expect(nights[0].tracks.map((t) => t.id)).toEqual(["t26", "t36"]);
    expect(nights[1].tracks.map((t) => t.id)).toEqual(["s01", "t18"]);
    expect(nights[2].tracks.map((t) => t.id)).toEqual(["t36", "s01"]);
    expect(nights[3].tracks.map((t) => t.id)).toEqual(["t26", "t18"]);
  });
});
