import { buildPlaylistCueFromSchedule } from "./schedule-playlist-cue";

describe("buildPlaylistCueFromSchedule", () => {
  const sameId = "00000000-0000-4000-8000-000000000001";

  it("includes duplicate track ids when the schedule repeats the same recording", () => {
    const schedule = [
      {
        night: 1,
        tracks: [
          { id: sameId, title: "A", skuCode: "SKU-A" },
          { id: sameId, title: "A", skuCode: "SKU-A" }
        ]
      }
    ];
    const cue = buildPlaylistCueFromSchedule(schedule, 1, 10);
    expect(cue).toHaveLength(2);
    expect(cue.every((t) => t.id === sameId)).toBe(true);
  });

  it("wraps nights starting at currentNight", () => {
    const schedule = [
      { night: 1, tracks: [{ id: "a", title: "A" }] },
      { night: 2, tracks: [{ id: "b", title: "B" }] }
    ];
    expect(buildPlaylistCueFromSchedule(schedule, 2, 10).map((t) => t.id)).toEqual(["b", "a"]);
  });
});
