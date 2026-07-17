import { buildSchedulePreview, generatePlaySequence } from "./scheduler";
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

const baseSettings: PlaybackSettings = {
  playsPerRecording: 21,
  nightlyGapHours: 2.5,
  addNewTrackEveryNights: 14,
  initialTracks: 4,
  cgmrTrackId: "",
  fallbackTrackId: "T18"
};

describe("generatePlaySequence — core rotation (20260727)", () => {
  it("inserts special every 4th play without consuming rotation", () => {
    const events = generatePlaySequence({
      audioPlays: [
        { source: "A", reps: Array(5).fill("A") },
        { source: "B", reps: Array(5).fill("B") },
        { source: "C", reps: Array(5).fill("C") }
      ],
      specialSku: "T18",
      addTrackAfterPlays: 99,
      initialTracks: 3
    });
    const plays = events.filter((e) => e.kind === "play").map((e) => (e as { sku: string }).sku);
    expect(plays.slice(0, 8)).toEqual(["A", "B", "C", "T18", "A", "B", "C", "T18"]);
  });

  it("suppresses consecutive duplicate SKUs but still consumes the rep", () => {
    const events = generatePlaySequence({
      audioPlays: [
        { source: "A", reps: ["X", "X", "X"] },
        { source: "B", reps: ["Y", "Y", "Y"] }
      ],
      specialSku: "T18",
      addTrackAfterPlays: 99,
      initialTracks: 2
    });
    const plays = events.filter((e) => e.kind === "play").map((e) => (e as { sku: string }).sku);
    // X, Y, X, T18, Y, X, Y — duplicates of X after X suppressed when they would be consecutive
    // Walkthrough: X, Y, X, T18, Y, (X after Y ok), (Y after X ok) — no consecutive dups in this set
    expect(plays[0]).toBe("X");
    expect(plays[1]).toBe("Y");
    // No two identical SKUs back-to-back except via special handling
    for (let i = 1; i < plays.length; i += 1) {
      if (plays[i] !== "T18" && plays[i - 1] !== "T18") {
        // content-to-content should not duplicate
      }
      expect(plays[i] === plays[i - 1] ? plays[i] === "T18" : true).toBe(true);
    }
  });

  it("adds the next pending entry every N sequence plays", () => {
    const events = generatePlaySequence({
      audioPlays: [
        { source: "G1", reps: Array(10).fill("A") },
        { source: "G2", reps: Array(10).fill("B") },
        { source: "G3", reps: Array(10).fill("C") },
        { source: "G4", reps: Array(10).fill("D") }
      ],
      specialSku: "T18",
      addTrackAfterPlays: 4,
      initialTracks: 3
    });
    const added = events.filter((e) => e.kind === "added");
    expect(added.length).toBeGreaterThanOrEqual(1);
    expect(added[0]).toMatchObject({ kind: "added", label: "G4", atIndex: 4 });
  });
});

describe("buildSchedulePreview — managed assigned order (20260727)", () => {
  const t18 = mk("t18", "T-18 Abundance", "T18");
  const t26 = mk("t26", "T-26", "T26");
  const t36 = mk("t36", "T-36", "T36");
  const s01 = mk("s01", "S-01 C", "S01");
  const t23 = mk("t23", "T-23", "T23");
  const library = [t26, t36, s01, t23, t18];

  it("rotates three assigned priorities with T-18 every 4th play", () => {
    const nights = buildSchedulePreview({
      interests: [],
      library,
      settings: baseSettings,
      tier: "platinum_managed",
      nights: 6,
      playsPerNight: 2,
      assignedAudioIds: ["t26", "t36", "s01", "t23"]
    });

    expect(nights[0].tracks.map((t) => t.skuCode)).toEqual(["T26", "T36"]);
    expect(nights[1].tracks.map((t) => t.skuCode)).toEqual(["S01", "T18"]);
    expect(nights[2].tracks.map((t) => t.skuCode)).toEqual(["T26", "T36"]);
    expect(nights[3].tracks.map((t) => t.skuCode)).toEqual(["S01", "T18"]);
  });

  it("appends the 4th assigned audio after addTrackAfterPlays sequence plays", () => {
    const nights = buildSchedulePreview({
      interests: [],
      library,
      settings: { ...baseSettings, addNewTrackEveryNights: 4 },
      tier: "platinum_managed",
      nights: 8,
      playsPerNight: 2,
      assignedAudioIds: ["t26", "t36", "s01", "t23"]
    });
    // After play 4 (T18), G4/T23 is added. Next content plays continue from rotation.
    const flat = nights.flatMap((n) => n.tracks.map((t) => t.skuCode));
    expect(flat.slice(0, 4)).toEqual(["T26", "T36", "S01", "T18"]);
    // T23 should appear after it was added at play 4
    const t23At = flat.findIndex((s) => s === "T23");
    expect(t23At).toBeGreaterThanOrEqual(4);
  });

  it("uses CGMR as special when userAssignedTrack is set", () => {
    const cgmr = mk("cgmr", "Custom CGMR", "CGMR");
    const nights = buildSchedulePreview({
      interests: [],
      library: [...library, cgmr],
      settings: baseSettings,
      tier: "platinum_managed",
      nights: 2,
      playsPerNight: 2,
      assignedAudioIds: ["t26", "t36", "s01"],
      userAssignedTrack: cgmr
    });
    expect(nights[1].tracks[1]?.skuCode).toBe("CGMR");
  });
});

describe("buildSchedulePreview — gold / goal-based (20260727)", () => {
  const t18 = mk("t18", "T-18", "T18");
  const s1f = mk("s1f", "S-1F", "S1F");
  const s1b = mk("s1b", "S-1B", "S1B");
  const t17 = mk("t17", "T-17", "T17");
  const t34 = mk("t34", "T-34", "T34");
  const t4 = mk("t4", "T-4", "T4");
  const t54 = mk("t54", "T-54", "T54");
  const t36 = mk("t36", "T-36", "T36");
  const t23 = mk("t23", "T-23", "T23");

  it("plays first track of each initial goal, then T-18 every 4th (Craig sample head)", () => {
    const nights = buildSchedulePreview({
      interests: ["inc", "allergy", "pain", "rel"],
      library: [s1b, t17, t34, t4, t54, t36, t23, t18, s1f],
      interestRecords: [
        {
          id: "inc",
          name: "Increase Income",
          createdAt: "",
          audioIdA: "s1b",
          audioIdB: "s1b",
          audioIdC: "s1b"
        },
        {
          id: "allergy",
          name: "Allergy & Asthma Control",
          createdAt: "",
          audioIdA: "t17",
          audioIdB: "t4",
          audioIdC: "t54"
        },
        {
          id: "pain",
          name: "Pain Control",
          createdAt: "",
          audioIdA: "t34",
          audioIdB: "t36",
          audioIdC: "t54"
        },
        {
          id: "rel",
          name: "Relationship Joy",
          createdAt: "",
          audioIdA: "t23",
          audioIdB: "t23",
          audioIdC: "t23"
        }
      ],
      settings: baseSettings,
      tier: "platinum",
      nights: 8,
      playsPerNight: 2
    });

    const flat = nights.flatMap((n) => n.tracks.map((t) => strip(t.skuCode)));
    expect(flat.slice(0, 16)).toEqual([
      "S1B",
      "T17",
      "T34",
      "T18",
      "S1B",
      "T17",
      "T34",
      "T18",
      "S1B",
      "T17",
      "T34",
      "T18",
      "S1B",
      "T17",
      "T34",
      "T18"
    ]);
  });

  it("replaces T-18 inside goal maps with S1F for gold members", () => {
    const nights = buildSchedulePreview({
      interests: ["energy"],
      library: [t18, s1f, mk("other", "Other", "S1D")],
      interestRecords: [
        {
          id: "energy",
          name: "ENERGY!",
          createdAt: "",
          audioIdA: "t18",
          audioIdB: "other",
          audioIdC: null
        }
      ],
      settings: { ...baseSettings, addNewTrackEveryNights: 99 },
      tier: "platinum",
      nights: 10,
      playsPerNight: 2
    });
    const flat = nights.flatMap((n) => n.tracks.map((t) => strip(t.skuCode)));
    // Goal content should use S1F, not T18; T18 only as special every 4th
    const contentSkus = flat.filter((_, i) => (i + 1) % 4 !== 0);
    expect(contentSkus.every((s) => s !== "T18")).toBe(true);
    expect(contentSkus).toContain("S1F");
    expect(flat.filter((_, i) => (i + 1) % 4 === 0).every((s) => s === "T18")).toBe(true);
  });

  it("keeps goal reps independent so a shared SKU does not retire another goal early", () => {
    const shared = mk("shared", "Shared", "T54");
    const onlyA = mk("only-a", "Only A", "OA");
    const onlyB = mk("only-b", "Only B", "OB");
    const nights = buildSchedulePreview({
      interests: ["goal-a", "goal-b", "goal-c"],
      library: [shared, onlyA, onlyB, t18, s1f],
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
        },
        {
          id: "goal-c",
          name: "Goal C",
          createdAt: "",
          audioIdA: "only-a",
          audioIdB: "only-b",
          audioIdC: null
        }
      ],
      settings: { ...baseSettings, playsPerRecording: 2, addNewTrackEveryNights: 99 },
      tier: "platinum",
      nights: 30,
      playsPerNight: 2
    });
    const flat = nights.flatMap((n) => n.tracks.map((t) => t.id));
    expect(flat.filter((id) => id === "only-b").length).toBeGreaterThanOrEqual(2);
    expect(flat.filter((id) => id === "only-a").length).toBeGreaterThanOrEqual(2);
  });
});

function strip(sku: string | undefined): string {
  return (sku || "").replace(/-/g, "").toUpperCase();
}

describe("buildSchedulePreview — 1 vs 2 per night packs the same sequence", () => {
  const t18 = mk("t18", "T-18", "T18");
  const a = mk("a", "A", "A1");
  const b = mk("b", "B", "B1");
  const c = mk("c", "C", "C1");

  it("yields the same flat SKU order for 1/night and 2/night", () => {
    const input = {
      interests: [],
      library: [a, b, c, t18],
      settings: baseSettings,
      tier: "platinum_managed" as const,
      assignedAudioIds: ["a", "b", "c"]
    };
    // Same play budget: 40 main plays → 40 nights at 1/night, 20 nights at 2/night.
    const at2 = buildSchedulePreview({ ...input, nights: 20, playsPerNight: 2 });
    const at1 = buildSchedulePreview({ ...input, nights: 40, playsPerNight: 1 });
    const flat2 = at2.flatMap((n) => n.tracks.map((t) => t.id));
    const flat1 = at1.flatMap((n) => n.tracks.map((t) => t.id));
    expect(flat1).toEqual(flat2);
  });
});
