import type { Interest, LibraryItem, PlaybackSettings } from "@/lib/types";
import { stripSkuHyphens } from "@/lib/library-metadata";

export type ScheduleNight = {
  night: number;
  tracks: LibraryItem[];
  note?: string;
  /** New goal (Gold) or assigned audio (Managed) enters the active rotation this night (add-new-track rule). */
  rotationAdded?: string[];
  /** Non-managed only: a goal leaves the active set at night start (main-play-count drop bands). */
  rotationSessionDrop?: string[];
  /** After this night’s plays: items removed when play-count hits `playsPerRecording` (both tiers). */
  rotationRemovedAfterPlays?: string[];
};

/**
 * Schedule is built in **main play** order (each first/second slot on a schedule night when 2/night counts as one play).
 * playsPerNight 2 = two main plays per schedule night; playsPerNight 1 = one main play per schedule night.
 * Add-new-track and goal drops use the same main-play counter. CGMR/T-18 is every 4th main play.
 * Managed assigned audios and active goals use a **queue**: each pick takes the front and moves it to the back;
 * newly added items are **pushed to the back** and do not play until after the current list completes a full cycle.
 */
type ScheduleInput = {
  interests: string[];
  library: LibraryItem[];
  interestRecords?: Interest[];
  settings: PlaybackSettings;
  tier: "platinum" | "platinum_managed";
  nights: number;
  /** 2 = two main plays per schedule night; 1 = one main play per schedule night (same rotation, schedule runs twice as many nights). */
  playsPerNight?: 1 | 2;
  /** When set, used as the special/CGMR track (every 4th play) instead of global cgmr/fallback. */
  userAssignedTrack?: LibraryItem | null;
  /** For managed members: ordered list of assigned audio IDs (replaces goals-based scheduling). */
  assignedAudioIds?: string[];
  /** When building e.g. "next 10 in cue", use this so enough tracks are in rotation (e.g. 11 => up to 10 in initial set). */
  initialTracksOverride?: number;
};

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
  const libraryByIdMap = libraryById(library);
  const isManagedMember = assignedAudioIds && assignedAudioIds.length > 0;
  
  // For managed members: use assigned audios directly
  let assignedAudios: LibraryItem[] = [];
  if (isManagedMember) {
    assignedAudios = assignedAudioIds
      .map((id) => libraryByIdMap.get(id))
      .filter((item): item is LibraryItem => !!item);
  }

  const goalTrackMap = buildGoalTrackMap(library, interestRecords);
  const orderedGoals = interests.filter((id) => goalTrackMap.has(id));

  const cgmr = settings.cgmrTrackId
    ? pickByCode(library, settings.cgmrTrackId)
    : null;
  const fallback = settings.fallbackTrackId
    ? pickByCode(library, settings.fallbackTrackId)
    : null;

  // Both platinum and platinum_managed use the same special track logic
  const defaultSpecialTrack = (tier === "platinum" || tier === "platinum_managed") ? cgmr || fallback : fallback || cgmr;
  const specialTrack = userAssignedTrack ?? defaultSpecialTrack;
  const playCounts = new Map<string, number>();
  
  // For managed members: use assigned audios; for regular members: use goals
  /**
   * `initialTracks` is meant as total rotation width: (content slots) + 1 for the CGMR/T-18 slot (every 4th main play).
   * So 4 ⇒ 3 content slots. If admin/DB still has `initialTracks === 3`, `initialMax - 1` is only 2 and the third
   * assigned priority never enters rotation (looks like "the first track keeps coming back"). When the pool has
   * at least three items, never use fewer than three slots so T-26 / T-36 / S-01 style lineups rotate correctly.
   */
  const initialMax = initialTracksOverride ?? settings.initialTracks;
  const configuredSlots = Math.max(1, initialMax - 1);
  const poolLen = isManagedMember ? assignedAudios.length : orderedGoals.length;
  const rotationFloor = poolLen >= 3 ? 3 : Math.max(1, poolLen);
  const goalCount = Math.min(poolLen, Math.max(configuredSlots, rotationFloor));
  /** Non-managed: goal ids in rotation order (queue: shift front, push back each pick). */
  const activeGoalQueue: string[] = isManagedMember ? [] : orderedGoals.slice(0, goalCount);
  /** Managed: assigned items in admin order; new adds append to the back and wait for a full cycle. */
  const assignedQueue: LibraryItem[] = isManagedMember ? assignedAudios.slice(0, goalCount) : [];
  let nextIndex = isManagedMember ? assignedQueue.length : activeGoalQueue.length;
  const goalTrackPointer = new Map<string, number>();

  const takeNextGoal = () => {
    if (!activeGoalQueue.length) {
      return null;
    }
    const goalId = activeGoalQueue.shift()!;
    activeGoalQueue.push(goalId);
    return goalId;
  };

  const takeNextTrackForGoal = (goalId: string) => {
    const tracks = goalTrackMap.get(goalId) || [];
    if (!tracks.length) {
      return null;
    }
    const pointer = goalTrackPointer.get(goalId) ?? 0;
    const track = tracks[pointer % tracks.length];
    goalTrackPointer.set(goalId, pointer + 1);
    return track;
  };

  const takeNextAssignedAudio = () => {
    if (!assignedQueue.length) {
      return null;
    }
    const audio = assignedQueue.shift()!;
    assignedQueue.push(audio);
    return audio;
  };

  const markPlayed = (item: LibraryItem | null) => {
    if (!item) return;
    const count = playCounts.get(item.id) || 0;
    playCounts.set(item.id, count + 1);
  };

  // Drop goals by main-play count so rotation matches 1 or 2 plays per night (1 per night doubles schedule nights)
  const dropGoalBySession: [number, number][] = [
    [88, 1], [90, 2], [92, 3], [110, 4], [124, 5], [138, 6], [152, 7], [166, 8], [178, 9], [180, 10]
  ];
  const getGoalToDropAtSession = (sessionsSoFar: number): number | null => {
    for (let i = 0; i < dropGoalBySession.length; i++) {
      const [threshold, goalIndex] = dropGoalBySession[i];
      const nextThreshold = dropGoalBySession[i + 1]?.[0] ?? Infinity;
      if (sessionsSoFar >= threshold && sessionsSoFar < nextThreshold) return goalIndex;
    }
    return null;
  };

  const schedule: ScheduleNight[] = [];
  let nextAddAtSession = settings.addNewTrackEveryNights > 0 ? settings.addNewTrackEveryNights : 0;
  const goalLabel = (goalId: string) =>
    interestRecords?.find((i) => i.id === goalId)?.name ?? goalId;

  for (let night = 1; night <= nights; night += 1) {
    const nightAdditions: string[] = [];
    const nightSessionDrops: string[] = [];
    // Add new goal/audio every N main plays (completed main plays before this night = (night - 1) * playsPerNight)
    const sessionsSoFar = (night - 1) * playsPerNight;
    if (isManagedMember) {
      while (
        nextAddAtSession > 0 &&
        sessionsSoFar >= nextAddAtSession &&
        nextIndex < assignedAudios.length
      ) {
        const adding = assignedAudios[nextIndex];
        assignedQueue.push(adding);
        nightAdditions.push(
          `${adding.title} — new assigned audio joins end of rotation (after ${sessionsSoFar} main plays completed; plays after current list cycles)`
        );
        nextIndex += 1;
        nextAddAtSession += settings.addNewTrackEveryNights;
      }
    } else {
      while (
        nextAddAtSession > 0 &&
        sessionsSoFar >= nextAddAtSession &&
        nextIndex < orderedGoals.length
      ) {
        const gid = orderedGoals[nextIndex];
        activeGoalQueue.push(gid);
        nightAdditions.push(
          `${goalLabel(gid)} — new goal joins end of rotation (after ${sessionsSoFar} main plays completed; plays after current list cycles)`
        );
        nextIndex += 1;
        nextAddAtSession += settings.addNewTrackEveryNights;
      }
    }

    if (!isManagedMember) {
      const dropGoalIndex = getGoalToDropAtSession(sessionsSoFar);
      if (dropGoalIndex && orderedGoals[dropGoalIndex - 1]) {
        const dropId = orderedGoals[dropGoalIndex - 1];
        const dropIdx = activeGoalQueue.indexOf(dropId);
        if (dropIdx !== -1) {
          nightSessionDrops.push(
            `${goalLabel(dropId)} — leaves active rotation (main-play drop rule; slot ${dropGoalIndex}; main plays at night start: ${sessionsSoFar})`
          );
          activeGoalQueue.splice(dropIdx, 1);
        }
      }
    }

    // T-18/CGMR on every 4th main play in order, regardless of 1 or 2 plays per schedule night
    const sessionIndexFirst = (night - 1) * playsPerNight + 1;
    const sessionIndexSecond = (night - 1) * playsPerNight + 2;
    const isSpecialSessionFirst = sessionIndexFirst % 4 === 0;
    const isSpecialSessionSecond = sessionIndexSecond % 4 === 0;

    /**
     * When the CGMR/T-18 slot replaces the second main play, advance the goal queue one step (managed: same for
     * assigned queue on 1/night whole-special only).
     */
    const advanceAssignedSlotForSpecialSecond = () => {
      if (!assignedQueue.length) return;
      const x = assignedQueue.shift()!;
      assignedQueue.push(x);
    };
    const advanceGoalSlotForSpecialSecond = () => {
      if (!activeGoalQueue.length) return;
      const g = activeGoalQueue.shift()!;
      activeGoalQueue.push(g);
    };

    let first: LibraryItem | null = null;
    let second: LibraryItem | null = null;

    if (playsPerNight === 1) {
      const skipTakeFirst =
        isSpecialSessionFirst && !!specialTrack;
      if (isManagedMember) {
        first = skipTakeFirst ? null : takeNextAssignedAudio();
      } else {
        if (skipTakeFirst) {
          first = null;
        } else {
          const firstGoal = takeNextGoal();
          first = firstGoal ? takeNextTrackForGoal(firstGoal) : null;
        }
      }
      /** One main play still consumes one rotation step when the whole night is CGMR/T-18 (same as 2-play fix). */
      if (skipTakeFirst && specialTrack) {
        if (isManagedMember) {
          advanceAssignedSlotForSpecialSecond();
        } else {
          advanceGoalSlotForSpecialSecond();
        }
      }
    } else {
      first = isManagedMember
        ? takeNextAssignedAudio()
        : (() => {
            const firstGoal = takeNextGoal();
            return firstGoal ? takeNextTrackForGoal(firstGoal) : null;
          })();
      if (isSpecialSessionSecond && specialTrack) {
        second = specialTrack;
        if (!isManagedMember) {
          advanceGoalSlotForSpecialSecond();
        }
      } else if (isManagedMember) {
        second = takeNextAssignedAudio();
      } else {
        const secondGoal = takeNextGoal();
        second = secondGoal ? takeNextTrackForGoal(secondGoal) : null;
      }
    }

    const singleTrack =
      playsPerNight === 1 && isSpecialSessionFirst && specialTrack
        ? specialTrack
        : first;
    const selectedTracks = playsPerNight === 1 ? [singleTrack] : [first, second];
    const filtered = selectedTracks.filter(
      (item): item is LibraryItem => !!item
    );
    // Keep both slots when the same recording appears twice in one night (e.g. goal + CGMR/T-18).
    const tracks = filtered;

    tracks.forEach((item) => markPlayed(item));

    const isSpecialThisNight = playsPerNight === 1 ? isSpecialSessionFirst : isSpecialSessionSecond;
    const noteSpecial = "T18/CGMR (every 4th main play)";
    const entry: ScheduleNight = {
      night,
      tracks,
      note:
        playsPerNight === 1
          ? isSpecialSessionFirst
            ? noteSpecial
            : "One main play per schedule night"
          : isSpecialThisNight
            ? noteSpecial
            : `Rotation night (${settings.nightlyGapHours} hour gap)`
    };
    if (nightAdditions.length) entry.rotationAdded = nightAdditions;
    if (nightSessionDrops.length) entry.rotationSessionDrop = nightSessionDrops;
    schedule.push(entry);

    const removedAfter: string[] = [];
    // Remove tracks that reached the play target
    if (settings.playsPerRecording > 0) {
      if (isManagedMember) {
        [...assignedQueue].forEach((audio) => {
          const playCount = playCounts.get(audio.id) || 0;
          if (playCount >= settings.playsPerRecording) {
            const idx = assignedQueue.findIndex((a) => a.id === audio.id);
            if (idx !== -1) {
              removedAfter.push(
                `${audio.title} — leaves rotation after this night (hit ${settings.playsPerRecording} plays)`
              );
              assignedQueue.splice(idx, 1);
            }
          }
        });
      } else {
        [...activeGoalQueue].forEach((goalId) => {
          const tracksForGoal = goalTrackMap.get(goalId) || [];
          const completed = tracksForGoal.every(
            (track) => (playCounts.get(track.id) || 0) >= settings.playsPerRecording
          );
          if (completed) {
            const idx = activeGoalQueue.indexOf(goalId);
            if (idx !== -1) {
              removedAfter.push(
                `${goalLabel(goalId)} — goal leaves rotation after this night (all its tracks hit ${settings.playsPerRecording} plays)`
              );
              activeGoalQueue.splice(idx, 1);
            }
          }
        });
      }
    }
    if (removedAfter.length) entry.rotationRemovedAfterPlays = removedAfter;
  }

  return schedule;
};
