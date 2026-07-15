import { buildSchedulePreview } from "./scheduler";
import type { LibraryItem, PlaybackSettings } from "./types";

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

describe("buildSchedulePreview — managed assigned order", () => {
  const settings: PlaybackSettings = {
    playsPerRecording: 21,
    nightlyGapHours: 2.5,
    addNewTrackEveryNights: 99,
    initialTracks: 3,
    cgmrTrackId: "",
    fallbackTrackId: "T18"
  };

  const t18 = mk("t18", "T-18 Abundance", "T18");
  const t26 = mk("t26", "T-26", "T26");
  const t36 = mk("t36", "T-36", "T36");
  const s01 = mk("s01", "S-01 C", "S01");
  const t23 = mk("t23", "T-23", "T23");
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
    expect(nights[2].tracks.map((t) => t.id)).toEqual(["t26", "t36"]);
    expect(nights[3].tracks.map((t) => t.id)).toEqual(["s01", "t18"]);
  });

  it("appends new assigned audio to the back so it does not play until after a full cycle of the prior list", () => {
    const settingsFastAdd: PlaybackSettings = {
      ...settings,
      addNewTrackEveryNights: 6
    };
    const nights = buildSchedulePreview({
      interests: [],
      library,
      settings: settingsFastAdd,
      tier: "platinum_managed",
      nights: 7,
      playsPerNight: 2,
      assignedAudioIds: ["t26", "t36", "s01", "t23"]
    });
    expect(nights[3].tracks.some((t) => t.id === "t23")).toBe(false);
    expect(nights[3].tracks.map((t) => t.id)).toEqual(["s01", "t18"]);
    expect(nights[4].tracks.some((t) => t.id === "t23")).toBe(false);
    expect(nights[4].tracks.map((t) => t.id)).toEqual(["t26", "t36"]);
    expect(nights[5].tracks.map((t) => t.id)).toEqual(["t23", "t18"]);
  });
});

describe("buildSchedulePreview — gold (platinum) duplicate tracks per night", () => {
  const settings: PlaybackSettings = {
    playsPerRecording: 21,
    nightlyGapHours: 2.5,
    addNewTrackEveryNights: 99,
    initialTracks: 3,
    cgmrTrackId: "T18",
    fallbackTrackId: "T18"
  };

  const t18 = mk("t18", "T-18 Abundance", "T18");
  const goalTrack = mk("g1", "Goal track");
  goalTrack.interestIds = ["goal-1"];

  it("keeps both slots when the same recording would appear twice in one night", () => {
    const nights = buildSchedulePreview({
      interests: ["goal-1"],
      library: [goalTrack, t18],
      interestRecords: [
        {
          id: "goal-1",
          name: "Abundance",
          createdAt: "",
          audioIdA: "t18",
          audioIdB: null,
          audioIdC: null
        }
      ],
      settings,
      tier: "platinum",
      nights: 4,
      playsPerNight: 2
    });
    const specialNight = nights.find((n) => n.tracks.length === 2 && n.tracks.every((t) => t.id === "t18"));
    expect(specialNight).toBeDefined();
    expect(specialNight!.tracks).toHaveLength(2);
  });
});

describe("buildSchedulePreview — gold play counts are goal-scoped", () => {
  const shared = mk("shared", "Shared track", "T54");
  const onlyA = mk("only-a", "Only goal A");
  const onlyB = mk("only-b", "Only goal B");
  const t18 = mk("t18", "T-18", "T18");

  it("does not retire a goal from another goal's plays of a shared audio", () => {
    const settings: PlaybackSettings = {
      playsPerRecording: 2,
      nightlyGapHours: 2.5,
      addNewTrackEveryNights: 999,
      initialTracks: 3,
      cgmrTrackId: "",
      fallbackTrackId: "T18"
    };
    const nights = buildSchedulePreview({
      interests: ["goal-a", "goal-b"],
      library: [shared, onlyA, onlyB, t18],
      interestRecords: [
        {
          id: "goal-a",
          name: "Goal A",
          createdAt: "",
          audioIdA: "shared",
          audioIdB: "only-a",
          audioIdC: null
        },
        {
          id: "goal-b",
          name: "Goal B",
          createdAt: "",
          audioIdA: "shared",
          audioIdB: "only-b",
          audioIdC: null
        }
      ],
      settings,
      tier: "platinum",
      nights: 20,
      playsPerNight: 2
    });

    // Goal A needs shared×2 and only-a×2 for this goal; Goal B needs its own shared×2.
    // Shared plays attributed only to Goal A must not complete Goal B early.
    const removedMentionsB = nights.flatMap((n) => n.rotationRemovedAfterPlays || []).filter((m) =>
      m.includes("Goal B")
    );
    const nightsWithGoalBTrack = nights.filter((n) =>
      n.tracks.some((t) => t.id === "only-b" || (t.id === "shared" && !n.note?.includes("T18/CGMR")))
    );
    // Goal B should still be producing tracks well after Goal A has used shared twice
    expect(nightsWithGoalBTrack.length).toBeGreaterThan(2);
    // If Goal B retired solely from Goal A's shared plays, it would leave after very few shared plays total.
    // Ensure Goal B is not removed before it has its own only-b plays in the schedule.
    const firstBOnlyIndex = nights.findIndex((n) => n.tracks.some((t) => t.id === "only-b"));
    const firstBRemoved = nights.findIndex((n) =>
      (n.rotationRemovedAfterPlays || []).some((m) => m.includes("Goal B"))
    );
    expect(firstBOnlyIndex).toBeGreaterThanOrEqual(0);
    if (firstBRemoved >= 0) {
      expect(firstBRemoved).toBeGreaterThanOrEqual(firstBOnlyIndex);
    }
    expect(removedMentionsB.length).toBeGreaterThanOrEqual(0);
  });

  it("does not count every-4th T-18 special toward a goal that also uses T-18", () => {
    const settings: PlaybackSettings = {
      playsPerRecording: 4,
      nightlyGapHours: 2.5,
      addNewTrackEveryNights: 999,
      initialTracks: 3,
      cgmrTrackId: "",
      fallbackTrackId: "T18"
    };
    const energy = mk("energy-other", "Energy other");
    const nights = buildSchedulePreview({
      interests: ["energy"],
      library: [t18, energy],
      interestRecords: [
        {
          id: "energy",
          name: "ENERGY!",
          createdAt: "",
          audioIdA: "t18",
          audioIdB: "energy-other",
          audioIdC: null
        }
      ],
      settings,
      tier: "platinum",
      nights: 40,
      playsPerNight: 2
    });

    const energyOtherPlayNights = nights.filter((n) =>
      n.tracks.some((t) => t.id === "energy-other")
    );
    expect(energyOtherPlayNights.length).toBeGreaterThanOrEqual(4);

    const firstRemoval = nights.findIndex((n) =>
      (n.rotationRemovedAfterPlays || []).some((m) => m.includes("ENERGY!"))
    );
    // Retirement requires 4 goal-attributed plays of EACH track. Specials must not skip energy-other.
    expect(firstRemoval).toBeGreaterThanOrEqual(0);
    const energyOtherBeforeRemoval = nights
      .slice(0, firstRemoval + 1)
      .reduce(
        (n, night) => n + night.tracks.filter((t) => t.id === "energy-other").length,
        0
      );
    expect(energyOtherBeforeRemoval).toBeGreaterThanOrEqual(4);
  });
});
