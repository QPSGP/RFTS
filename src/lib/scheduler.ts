import type { Interest, LibraryItem, PlaybackSettings } from "@/lib/types";

export type ScheduleNight = {
  night: number;
  tracks: LibraryItem[];
  note?: string;
};

/**
 * Schedule is session-based (plays), not night-based. One play = one session.
 * playsPerNight 2 = two sessions per night; playsPerNight 1 = one session per night (same rotation, double the nights).
 * Add-new-track and T18/CGMR special slot are keyed off session index; goal drops are by session count.
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
  /** When set, used as the special/CGMR track (e.g. every 4th night) instead of global cgmr/fallback. */
  userAssignedTrack?: LibraryItem | null;
  /** For managed members: ordered list of assigned audio IDs (replaces goals-based scheduling). */
  assignedAudioIds?: string[];
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
  assignedAudioIds = undefined
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
  const goalCount = isManagedMember
    ? Math.max(1, Math.min(assignedAudios.length, settings.initialTracks - 1))
    : Math.max(1, Math.min(orderedGoals.length, settings.initialTracks - 1));
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
  for (let night = 1; night <= nights; night += 1) {
    // Add new goal/audio every N sessions (sessions so far = (night - 1) * playsPerNight)
    const sessionsSoFar = (night - 1) * playsPerNight;
    if (isManagedMember) {
      while (
        nextAddAtSession > 0 &&
        sessionsSoFar >= nextAddAtSession &&
        nextIndex < assignedAudios.length
      ) {
        activeAssignedAudios.push(assignedAudios[nextIndex]);
        nextIndex += 1;
        nextAddAtSession += settings.addNewTrackEveryNights;
      }
    } else {
      while (
        nextAddAtSession > 0 &&
        sessionsSoFar >= nextAddAtSession &&
        nextIndex < orderedGoals.length
      ) {
        activeGoals.push(orderedGoals[nextIndex]);
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
          activeGoals.splice(dropIdx, 1);
        }
      }
    }

    // Session-based rotation: same sequence of plays whether 1 or 2 per night (1 per night = double the nights)
    const sessionIndexFirst = (night - 1) * playsPerNight + 1;
    const sessionIndexSecond = (night - 1) * playsPerNight + 2;
    const isSpecialSessionFirst = sessionIndexFirst % 8 === 0;
    const isSpecialSessionSecond = sessionIndexSecond % 8 === 0;

    const first = isManagedMember
      ? takeNextAssignedAudio()
      : (() => {
          const firstGoal = takeNextGoal();
          return firstGoal ? takeNextTrackForGoal(firstGoal) : null;
        })();
    const second =
      playsPerNight === 2
        ? isSpecialSessionSecond
          ? specialTrack
          : isManagedMember
            ? takeNextAssignedAudio()
            : (() => {
                const secondGoal = takeNextGoal();
                return secondGoal ? takeNextTrackForGoal(secondGoal) : null;
              })()
        : null;
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
    schedule.push({
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
    });

    // Remove tracks that reached the play target
    if (settings.playsPerRecording > 0) {
      if (isManagedMember) {
        // For managed members: remove audios that reached play target
        activeAssignedAudios.forEach((audio) => {
          const playCount = playCounts.get(audio.id) || 0;
          if (playCount >= settings.playsPerRecording) {
            const idx = activeAssignedAudios.indexOf(audio);
            if (idx !== -1) {
              activeAssignedAudios.splice(idx, 1);
            }
          }
        });
      } else {
        // For regular members: remove goals whose tracks all reached play target
        activeGoals.forEach((goalId) => {
          const tracksForGoal = goalTrackMap.get(goalId) || [];
          const completed = tracksForGoal.every(
            (track) => (playCounts.get(track.id) || 0) >= settings.playsPerRecording
          );
          if (completed) {
            const idx = activeGoals.indexOf(goalId);
            if (idx !== -1) {
              activeGoals.splice(idx, 1);
            }
          }
        });
      }
    }
  }

  return schedule;
};
