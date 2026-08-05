import type { Interest, LibraryItem, PlaybackSettings } from "@/lib/types";
import { stripSkuHyphens } from "@/lib/sku-code";

export type ScheduleNight = {
  night: number;
  tracks: LibraryItem[];
  note?: string;
  /** New goal (Gold) or assigned audio (Managed) enters the active rotation this night (add-new-track rule). */
  rotationAdded?: string[];
  /** @deprecated Hard-coded session drop bands removed; kept for export/UI compatibility. */
  rotationSessionDrop?: string[];
  /** After this night’s plays: items removed when their rep list is exhausted. */
  rotationRemovedAfterPlays?: string[];
};

/**
 * Sequence generation (20260727 Sequence Generation / sequence-generator.py):
 *
 * Builds a flat ordered list of main plays, then packs into schedule nights.
 * - Start with INITIAL content entries in a rotation list (default 3).
 * - Each Gold goal is one rotation entry: A×N, then B×N, then C×N (N = playsPerRecording).
 * - Each Managed assigned audio is one rotation entry: track×N.
 * - Walk the rotation with an index; when a rep list empties, remove that entry.
 * - Every 4th sequence position is CGMR or T-18 (does not consume a rotation step).
 * - Every ADD plays (default 14) of sequence length, append the next pending entry.
 * - Suppress consecutive duplicate SKUs (rep still consumed; not written to sequence).
 * - Gold always uses T-18 as the 4th-play special; T-18 inside goal maps → S1F.
 * - Managed with CGMR uses CGMR every 4th; without CGMR uses T-18 and T-18 in playlist → S1F.
 *
 * 1 vs 2 audios per night only changes how the flat sequence is packed into nights -
 * not the sequence order itself.
 */
type ScheduleInput = {
  interests: string[];
  library: LibraryItem[];
  interestRecords?: Interest[];
  settings: PlaybackSettings;
  tier: "platinum" | "platinum_managed";
  nights: number;
  /** 2 = two main plays per schedule night; 1 = one main play per schedule night. */
  playsPerNight?: 1 | 2;
  /** When set, used as the special/CGMR track (every 4th play) instead of global cgmr/fallback. */
  userAssignedTrack?: LibraryItem | null;
  /** For managed members: ordered list of assigned audio IDs (replaces goals-based scheduling). */
  assignedAudioIds?: string[];
  /** Override initial content slots in the rotation (default derived from settings.initialTracks). */
  initialTracksOverride?: number;
};

type AudioPlayEntry = {
  source: string;
  /** Remaining SKU codes to emit (already expanded to N reps each). */
  reps: string[];
};

type SequenceEvent =
  | { kind: "play"; sku: string; source: string; isSpecial: boolean }
  | { kind: "added"; label: string; atIndex: number }
  | { kind: "removed"; label: string; atIndex: number };

const S1F_TRACK = "S1F";
const T18_TRACK = "T18";
const CGMR_OR_T18_NTH = 4;
const SUPPRESS_DUPLICATE_PLAYS = true;
const TRACKS_PER_GOAL = 3;

const libraryById = (library: LibraryItem[]) => {
  const m = new Map<string, LibraryItem>();
  library.forEach((item) => m.set(item.id, item));
  return m;
};

const buildGoalTrackMap = (
  library: LibraryItem[],
  interestRecords?: Interest[]
): Map<string, LibraryItem[]> => {
  const map = new Map<string, LibraryItem[]>();
  const byId = libraryById(library);

  if (interestRecords?.length) {
    interestRecords.forEach((interest) => {
      const ordered: LibraryItem[] = [];
      [interest.audioIdA, interest.audioIdB, interest.audioIdC]
        .filter(Boolean)
        .forEach((id) => {
          const item = id ? byId.get(id) : null;
          if (item) ordered.push(item);
        });
      if (ordered.length > 0) {
        map.set(interest.id, ordered);
      }
    });
  }

  library.forEach((item) => {
    item.interestIds.forEach((interestId) => {
      if (map.has(interestId)) return;
      if (!map.has(interestId)) {
        map.set(interestId, []);
      }
      map.get(interestId)!.push(item);
    });
  });
  map.forEach((items, key) => {
    const hasOrderedSlots = interestRecords?.some(
      (i) => i.id === key && (i.audioIdA || i.audioIdB || i.audioIdC)
    );
    if (!hasOrderedSlots) {
      map.set(
        key,
        items.slice().sort((a, b) => a.title.localeCompare(b.title))
      );
    }
  });
  return map;
};

const pickByCode = (library: LibraryItem[], code: string) => {
  const norm = stripSkuHyphens(code);
  if (!norm) return null;
  return (
    library.find(
      (item) =>
        stripSkuHyphens(item.skuCode || "") === norm ||
        stripSkuHyphens(item.skuCode || "").includes(norm) ||
        (item.title || "").toUpperCase().includes(norm)
    ) || null
  );
};

const skuOf = (item: LibraryItem): string => {
  const fromSku = stripSkuHyphens(item.skuCode || "");
  if (fromSku) return fromSku;
  return item.id;
};

/** Content slots in the initial rotation (Python INITIAL_TRACKS = 3). */
const resolveInitialContentSlots = (
  settings: PlaybackSettings,
  override?: number
): number => {
  if (typeof override === "number" && override > 0) return override;
  const raw = settings.initialTracks;
  // Legacy UI meaning: initialTracks includes the CGMR/T-18 slot (4 ⇒ 3 content).
  if (raw >= 4) return raw - 1;
  return Math.max(1, raw || 3);
};

const buildReps = (sku: string, playsPerTrack: number): string[] => {
  const reps: string[] = [];
  const n = Math.max(1, playsPerTrack);
  for (let i = 0; i < n; i += 1) reps.push(sku);
  return reps;
};

/**
 * Core sequence builder - mirrors processAudios() in sequence-generator.py.
 * Returns play events plus add/remove annotations keyed by sequence index (1-based play count).
 */
export const generatePlaySequence = ({
  audioPlays,
  specialSku,
  addTrackAfterPlays,
  initialTracks
}: {
  audioPlays: AudioPlayEntry[];
  specialSku: string;
  addTrackAfterPlays: number;
  initialTracks: number;
}): SequenceEvent[] => {
  const pending = audioPlays.map((p) => ({
    source: p.source,
    reps: [...p.reps]
  }));
  const events: SequenceEvent[] = [];
  if (pending.length === 0) return events;

  const initialCount = Math.min(initialTracks, pending.length);
  const rotation: AudioPlayEntry[] = [];
  for (let i = 0; i < initialCount; i += 1) {
    rotation.push(pending.shift()!);
  }

  let rotationIdx = 0;
  let lastTrack = "";
  let sequenceLen = 0;

  const maybeAddTrack = () => {
    if (addTrackAfterPlays <= 0) return;
    if (sequenceLen % addTrackAfterPlays !== 0) return;
    if (pending.length === 0) return;
    const next = pending.shift()!;
    rotation.push(next);
    events.push({ kind: "added", label: next.source, atIndex: sequenceLen });
  };

  while (rotation.length > 0) {
    // Insert special every Nth play - does not consume a rotation step.
    if ((sequenceLen + 1) % CGMR_OR_T18_NTH === 0) {
      sequenceLen += 1;
      events.push({
        kind: "play",
        sku: specialSku,
        source: specialSku,
        isSpecial: true
      });
      lastTrack = specialSku;
      maybeAddTrack();
      continue;
    }

    if (rotationIdx >= rotation.length) {
      rotationIdx = 0;
    }

    const entry = rotation[rotationIdx]!;
    const nextTrack = entry.reps.shift()!;
    const priorIdx = rotationIdx;
    const finalPlay = entry.reps.length === 0;
    if (finalPlay) {
      rotation.splice(priorIdx, 1);
      // Do not advance idx - next entry shifts into this slot.
    } else {
      rotationIdx = priorIdx + 1;
    }

    if (SUPPRESS_DUPLICATE_PLAYS && nextTrack === lastTrack) {
      // Consume the rep but do not write to the sequence (and do not maybeAddTrack).
      if (finalPlay) {
        events.push({
          kind: "removed",
          label: entry.source,
          atIndex: sequenceLen
        });
      }
      continue;
    }

    sequenceLen += 1;
    events.push({
      kind: "play",
      sku: nextTrack,
      source: entry.source,
      isSpecial: false
    });
    lastTrack = nextTrack;
    maybeAddTrack();
    if (finalPlay) {
      events.push({
        kind: "removed",
        label: entry.source,
        atIndex: sequenceLen
      });
    }
  }

  return events;
};

export const buildSchedulePreview = ({
  interests,
  library,
  interestRecords,
  settings,
  tier,
  nights,
  playsPerNight = 2,
  userAssignedTrack = null,
  assignedAudioIds = undefined,
  initialTracksOverride
}: ScheduleInput): ScheduleNight[] => {
  void tier;
  const libraryByIdMap = libraryById(library);
  const isManagedMember = !!(assignedAudioIds && assignedAudioIds.length > 0);

  const assignedAudios: LibraryItem[] = isManagedMember
    ? assignedAudioIds!
        .map((id) => libraryByIdMap.get(id))
        .filter((item): item is LibraryItem => !!item)
    : [];

  const goalTrackMap = buildGoalTrackMap(library, interestRecords);
  const orderedGoals = interests.filter((id) => goalTrackMap.has(id));

  const cgmr = settings.cgmrTrackId
    ? pickByCode(library, settings.cgmrTrackId)
    : null;
  const fallback = settings.fallbackTrackId
    ? pickByCode(library, settings.fallbackTrackId)
    : null;
  const s1f = pickByCode(library, S1F_TRACK);

  const playsPerTrack = Math.max(1, settings.playsPerRecording || 21);
  const addTrackAfterPlays =
    settings.addNewTrackEveryNights > 0 ? settings.addNewTrackEveryNights : 14;
  const initialContentSlots = resolveInitialContentSlots(
    settings,
    initialTracksOverride
  );

  /**
   * Goal-based (tier platinum / Python "Gold"): always T-18 as the 4th-play special.
   * Managed (Python "Platinum"): CGMR when available, else T-18.
   */
  const isGoalBased = !isManagedMember;
  let specialItem: LibraryItem | null = null;
  let replaceT18WithS1f = false;

  if (isGoalBased) {
    specialItem = fallback || pickByCode(library, T18_TRACK) || cgmr;
    replaceT18WithS1f = true;
  } else {
    const hasCgmr = !!(userAssignedTrack || cgmr);
    if (hasCgmr) {
      specialItem = userAssignedTrack ?? cgmr;
      replaceT18WithS1f = false;
    } else {
      specialItem = fallback || pickByCode(library, T18_TRACK);
      replaceT18WithS1f = true;
    }
  }

  const specialSku = specialItem ? skuOf(specialItem) : T18_TRACK;
  if (!specialItem) {
    specialItem = pickByCode(library, specialSku);
  }

  const resolveSkuItem = (sku: string): LibraryItem | null => {
    if (specialItem && skuOf(specialItem) === stripSkuHyphens(sku)) {
      return specialItem;
    }
    return pickByCode(library, sku);
  };

  const mapTrackSku = (item: LibraryItem): string => {
    let sku = skuOf(item);
    if (replaceT18WithS1f && sku === T18_TRACK) {
      sku = S1F_TRACK;
    }
    return sku;
  };

  const goalLabel = (goalId: string) =>
    interestRecords?.find((i) => i.id === goalId)?.name ?? goalId;

  const audioPlays: AudioPlayEntry[] = [];

  if (isManagedMember) {
    assignedAudios.forEach((audio, idx) => {
      const sku = mapTrackSku(audio);
      audioPlays.push({
        source: `Audio ${idx + 1}: ${sku}`,
        reps: buildReps(sku, playsPerTrack)
      });
    });
  } else {
    orderedGoals.forEach((goalId, goalIdx) => {
      const tracks = (goalTrackMap.get(goalId) || []).slice(0, TRACKS_PER_GOAL);
      if (!tracks.length) return;
      const skus = tracks.map((t) => mapTrackSku(t));
      const reps: string[] = [];
      skus.forEach((sku) => {
        reps.push(...buildReps(sku, playsPerTrack));
      });
      audioPlays.push({
        source: `Goal ${goalIdx + 1}: ${goalLabel(goalId)} (${skus.join(" ")})`,
        reps
      });
    });
  }

  if (audioPlays.length === 0) {
    return [];
  }

  const events = generatePlaySequence({
    audioPlays,
    specialSku,
    addTrackAfterPlays,
    initialTracks: Math.min(initialContentSlots, audioPlays.length)
  });

  const plays = events.filter(
    (e): e is Extract<SequenceEvent, { kind: "play" }> => e.kind === "play"
  );

  // Index annotations by play count for night packaging.
  const addedByPlay = new Map<number, string[]>();
  const removedByPlay = new Map<number, string[]>();
  for (const e of events) {
    if (e.kind === "added") {
      const list = addedByPlay.get(e.atIndex) || [];
      list.push(e.label);
      addedByPlay.set(e.atIndex, list);
    } else if (e.kind === "removed") {
      const list = removedByPlay.get(e.atIndex) || [];
      list.push(e.label);
      removedByPlay.set(e.atIndex, list);
    }
  }

  const ppn = playsPerNight === 1 ? 1 : 2;
  const schedule: ScheduleNight[] = [];
  let playCursor = 0;

  for (let night = 1; night <= nights; night += 1) {
    if (playCursor >= plays.length) break;

    const nightPlays = plays.slice(playCursor, playCursor + ppn);
    playCursor += nightPlays.length;

    const tracks: LibraryItem[] = [];
    for (const p of nightPlays) {
      let item = resolveSkuItem(p.sku);
      if (!item && p.sku === S1F_TRACK && s1f) item = s1f;
      if (!item && p.isSpecial && specialItem) item = specialItem;
      if (item) tracks.push(item);
    }

    const playEndIndex = playCursor; // 1-based end after this night's plays
    const playStartIndex = playEndIndex - nightPlays.length + 1;
    const nightAdditions: string[] = [];
    const nightRemovals: string[] = [];
    for (let i = playStartIndex; i <= playEndIndex; i += 1) {
      for (const label of addedByPlay.get(i) || []) {
        nightAdditions.push(`${label} - joins end of rotation (after ${i} sequence plays)`);
      }
      for (const label of removedByPlay.get(i) || []) {
        nightRemovals.push(
          `${label} - leaves rotation after this night (reps exhausted)`
        );
      }
    }

    const hasSpecial = nightPlays.some((p) => p.isSpecial);
    const entry: ScheduleNight = {
      night,
      tracks,
      note:
        ppn === 1
          ? hasSpecial
            ? "T18/CGMR (every 4th main play)"
            : "One main play per schedule night"
          : hasSpecial
            ? "T18/CGMR (every 4th main play)"
            : `Rotation night (${settings.nightlyGapHours} hour gap)`
    };
    if (nightAdditions.length) entry.rotationAdded = nightAdditions;
    if (nightRemovals.length) entry.rotationRemovedAfterPlays = nightRemovals;
    schedule.push(entry);
  }

  return schedule;
};
