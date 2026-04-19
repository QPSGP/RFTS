import type { Interest, LibraryItem, PlaybackSettings } from "@/lib/types";

export type ScheduleNight = {
  night: number;
  tracks: LibraryItem[];
  note?: string;
  /** New goal (Gold) or assigned audio (Managed) enters the active rotation this night (add-new-track rule). */
  rotationAdded?: string[];
  /** Non-managed only: a goal leaves the active set at night start (session-count drop bands). */
  rotationSessionDrop?: string[];
  /** After this night’s plays: items removed when play-count hits `playsPerRecording` (both tiers). */
  rotationRemovedAfterPlays?: string[];
};

/**
 * Schedule is session-based (plays), not night-based. One play = one session.
 * playsPerNight 2 = two sessions per night; playsPerNight 1 = one session per night (same rotation, double the nights).
 * Add-new-track and goal drops are by session count. T18/CGMR plays every 4th session (play).
 */
type ScheduleInput = {
  interests: string[];
  library: LibraryItem[];
  interestRecords?: Interest[];
  settings: PlaybackSettings;
  tier: "platinum" | "platinum_managed";
  nights: number;
  /** 2 = one full session (two plays) per night; 1 = half a session (one play) per night. */
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
  const upper = code.toUpperCase();
  return (
    library.find(
      (item) =>
        (item.skuCode || "").toUpperCase().includes(upper) ||
        (item.title || "").toUpperCase().includes(upper)
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
  const initialMax = initialTracksOverride ?? settings.initialTracks;
  const goalCount = isManagedMember
    ? Math.max(1, Math.min(assignedAudios.length, initialMax - 1))
    : Math.max(1, Math.min(orderedGoals.length, initialMax - 1));
  const activeGoals = isManagedMember ? [] : orderedGoals.slice(0, goalCount);
  const activeAssignedAudios = isManagedMember ? assignedAudios.slice(0, goalCount) : [];
  let nextIndex = isManagedMember ? activeAssignedAudios.length : activeGoals.length;
  let goalPointer = 0;
  let assignedAudioPointer = 0;
  const goalTrackPointer = new Map<string, number>();

  const takeNextGoal = () => {
    if (!activeGoals.length) {
      return null;
    }
    const goalId = activeGoals[goalPointer % activeGoals.length];
    goalPointer += 1;
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
    if (!activeAssignedAudios.length) {
      return null;
    }
    const audio = activeAssignedAudios[assignedAudioPointer % activeAssignedAudios.length];
    assignedAudioPointer += 1;
    return audio;
  };

  const markPlayed = (item: LibraryItem | null) => {
    if (!item) return;
    const count = playCounts.get(item.id) || 0;
    playCounts.set(item.id, count + 1);
  };

  // Drop goals by session count so rotation is the same for 1 or 2 plays per night (1 per night = double the nights)
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
    // Add new goal/audio every N sessions (sessions so far = (night - 1) * playsPerNight)
    const sessionsSoFar = (night - 1) * playsPerNight;
    if (isManagedMember) {
      while (
        nextAddAtSession > 0 &&
        sessionsSoFar >= nextAddAtSession &&
        nextIndex < assignedAudios.length
      ) {
        const adding = assignedAudios[nextIndex];
        activeAssignedAudios.push(adding);
        nightAdditions.push(
          `${adding.title} — new assigned audio enters rotation (after ${sessionsSoFar} sessions completed)`
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
        activeGoals.push(gid);
        nightAdditions.push(
          `${goalLabel(gid)} — new goal enters rotation (after ${sessionsSoFar} sessions completed)`
        );
        nextIndex += 1;
        nextAddAtSession += settings.addNewTrackEveryNights;
      }
    }

    if (!isManagedMember) {
      const dropGoalIndex = getGoalToDropAtSession(sessionsSoFar);
      if (dropGoalIndex && orderedGoals[dropGoalIndex - 1]) {
        const dropId = orderedGoals[dropGoalIndex - 1];
        const dropIdx = activeGoals.indexOf(dropId);
        if (dropIdx !== -1) {
          nightSessionDrops.push(
            `${goalLabel(dropId)} — leaves active rotation (session-drop rule; slot ${dropGoalIndex}; sessions at night start: ${sessionsSoFar})`
          );
          activeGoals.splice(dropIdx, 1);
        }
      }
    }

    // T-18/CGMR plays every 4th session (play), regardless of 1 or 2 per night
    const sessionIndexFirst = (night - 1) * playsPerNight + 1;
    const sessionIndexSecond = (night - 1) * playsPerNight + 2;
    const isSpecialSessionFirst = sessionIndexFirst % 4 === 0;
    const isSpecialSessionSecond = sessionIndexSecond % 4 === 0;

    /**
     * When the CGMR/T-18 slot replaces a normal play, we still consume one step in the rotation.
     * Otherwise the pointer never advances for that session and the first assigned goal repeats too often.
     */
    const advanceAssignedSlotForSpecialSecond = () => {
      if (!activeAssignedAudios.length) return;
      assignedAudioPointer += 1;
    };
    const advanceGoalSlotForSpecialSecond = () => {
      if (!activeGoals.length) return;
      goalPointer += 1;
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
      /** One session still consumes one rotation step when the whole night is CGMR/T-18 (same as 2-play fix). */
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
        if (isManagedMember) {
          advanceAssignedSlotForSpecialSecond();
        } else {
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
    // Dedupe by id so the same track (e.g. T-18 in both goal and special slot) appears once
    const seenIds = new Set<string>();
    const tracks = filtered.filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });

    tracks.forEach((item) => markPlayed(item));

    const isSpecialThisNight = playsPerNight === 1 ? isSpecialSessionFirst : isSpecialSessionSecond;
    const noteSpecial =
      playsPerNight === 1 ? "T18/CGMR session" : "T18/CGMR night";
    const entry: ScheduleNight = {
      night,
      tracks,
      note:
        playsPerNight === 1
          ? isSpecialSessionFirst
            ? noteSpecial
            : "One session per night"
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
        activeAssignedAudios.forEach((audio) => {
          const playCount = playCounts.get(audio.id) || 0;
          if (playCount >= settings.playsPerRecording) {
            const idx = activeAssignedAudios.indexOf(audio);
            if (idx !== -1) {
              removedAfter.push(
                `${audio.title} — leaves rotation after this night (hit ${settings.playsPerRecording} plays)`
              );
              activeAssignedAudios.splice(idx, 1);
            }
          }
        });
      } else {
        activeGoals.forEach((goalId) => {
          const tracksForGoal = goalTrackMap.get(goalId) || [];
          const completed = tracksForGoal.every(
            (track) => (playCounts.get(track.id) || 0) >= settings.playsPerRecording
          );
          if (completed) {
            const idx = activeGoals.indexOf(goalId);
            if (idx !== -1) {
              removedAfter.push(
                `${goalLabel(goalId)} — goal leaves rotation after this night (all its tracks hit ${settings.playsPerRecording} plays)`
              );
              activeGoals.splice(idx, 1);
            }
          }
        });
      }
    }
    if (removedAfter.length) entry.rotationRemovedAfterPlays = removedAfter;
  }

  return schedule;
};
