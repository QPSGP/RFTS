import type { LibraryItem, PlaybackSettings } from "@/lib/types";

export type ScheduleNight = {
  night: number;
  tracks: LibraryItem[];
  note?: string;
};

type ScheduleInput = {
  interests: string[];
  library: LibraryItem[];
  settings: PlaybackSettings;
  tier: "bronze" | "gold" | "platinum";
  nights: number;
  playsPerNight?: 1 | 2;
};

const buildGoalTrackMap = (library: LibraryItem[]) => {
  const map = new Map<string, LibraryItem[]>();
  library.forEach((item) => {
    item.interestIds.forEach((interestId) => {
      if (!map.has(interestId)) {
        map.set(interestId, []);
      }
      map.get(interestId)?.push(item);
    });
  });
  map.forEach((items, key) => {
    map.set(
      key,
      items.slice().sort((a, b) => a.title.localeCompare(b.title))
    );
  });
  return map;
};

const pickByCode = (library: LibraryItem[], code: string) => {
  const upper = code.toUpperCase();
  return (
    library.find((item) => item.title.toUpperCase().includes(upper)) || null
  );
};

export const buildSchedulePreview = ({
  interests,
  library,
  settings,
  tier,
  nights,
  playsPerNight = 2
}: ScheduleInput): ScheduleNight[] => {
  const goalTrackMap = buildGoalTrackMap(library);
  const orderedGoals = interests.filter((id) => goalTrackMap.has(id));

  const cgmr = settings.cgmrTrackId
    ? pickByCode(library, settings.cgmrTrackId)
    : null;
  const fallback = settings.fallbackTrackId
    ? pickByCode(library, settings.fallbackTrackId)
    : null;

  const specialTrack = tier === "platinum" ? cgmr || fallback : fallback || cgmr;
  const playCounts = new Map<string, number>();
  const activeGoals = orderedGoals.slice(0, Math.max(settings.initialTracks, 1));
  let nextIndex = activeGoals.length;
  let goalPointer = 0;
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

  const markPlayed = (item: LibraryItem | null) => {
    if (!item) return;
    const count = playCounts.get(item.id) || 0;
    playCounts.set(item.id, count + 1);
  };

  const shouldDropGoalOnNight = (night: number) => {
    const dropMap = new Map<number, number>([
      [45, 1],
      [46, 2],
      [47, 3],
      [56, 4],
      [63, 5],
      [70, 6],
      [77, 7],
      [84, 8],
      [90, 10],
      [91, 9]
    ]);
    return dropMap.get(night) || null;
  };

  const schedule: ScheduleNight[] = [];
  for (let night = 1; night <= nights; night += 1) {
    if (
      night > 1 &&
      settings.addNewTrackEveryNights > 0 &&
      (night - 1) % settings.addNewTrackEveryNights === 0 &&
      nextIndex < orderedGoals.length
    ) {
      activeGoals.push(orderedGoals[nextIndex]);
      nextIndex += 1;
    }

    const dropGoalIndex = shouldDropGoalOnNight(night);
    if (dropGoalIndex && orderedGoals[dropGoalIndex - 1]) {
      const dropId = orderedGoals[dropGoalIndex - 1];
      const dropIdx = activeGoals.indexOf(dropId);
      if (dropIdx !== -1) {
        activeGoals.splice(dropIdx, 1);
      }
    }

    const firstGoal = takeNextGoal();
    const first = firstGoal ? takeNextTrackForGoal(firstGoal) : null;
    const second =
      playsPerNight === 2
        ? night % 4 === 0
          ? specialTrack
          : (() => {
              const secondGoal = takeNextGoal();
              return secondGoal ? takeNextTrackForGoal(secondGoal) : null;
            })()
        : null;
    const selectedTracks = playsPerNight === 1 ? [first] : [first, second];
    const tracks = selectedTracks.filter(
      (item): item is LibraryItem => !!item
    );

    tracks.forEach((item) => markPlayed(item));

    schedule.push({
      night,
      tracks,
      note:
        playsPerNight === 1
          ? "One session per night"
          : night % 4 === 0
            ? `T18/CGMR night (${settings.nightlyGapHours} hour gap)`
            : `Rotation night (${settings.nightlyGapHours} hour gap)`
    });

    // Remove tracks that reached the play target
    if (settings.playsPerRecording > 0) {
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

  return schedule;
};
