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

const pickFirstByInterest = (library: LibraryItem[], interestId: string) => {
  return library.find((item) => item.interestIds.includes(interestId)) || null;
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
  const orderedTracks = interests
    .map((id) => pickFirstByInterest(library, id))
    .filter((item): item is LibraryItem => !!item);

  const cgmr = settings.cgmrTrackId
    ? pickByCode(library, settings.cgmrTrackId)
    : null;
  const fallback = settings.fallbackTrackId
    ? pickByCode(library, settings.fallbackTrackId)
    : null;

  const specialTrack = tier === "platinum" ? cgmr || fallback : fallback || cgmr;
  const playCounts = new Map<string, number>();
  const active: LibraryItem[] = orderedTracks.slice(
    0,
    Math.max(settings.initialTracks, 1)
  );
  let nextIndex = active.length;
  let pointer = 0;

  const takeNext = () => {
    if (!active.length) {
      return null;
    }
    const item = active[pointer % active.length];
    pointer += 1;
    return item;
  };

  const markPlayed = (item: LibraryItem | null) => {
    if (!item) return;
    const count = playCounts.get(item.id) || 0;
    playCounts.set(item.id, count + 1);
  };

  const schedule: ScheduleNight[] = [];
  for (let night = 1; night <= nights; night += 1) {
    if (
      night > 1 &&
      settings.addNewTrackEveryNights > 0 &&
      (night - 1) % settings.addNewTrackEveryNights === 0 &&
      nextIndex < orderedTracks.length
    ) {
      active.push(orderedTracks[nextIndex]);
      nextIndex += 1;
    }

    const first = takeNext();
    const second = night % 2 === 1 ? takeNext() : specialTrack;
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
          : night % 2 === 1
            ? `Rotation night (${settings.nightlyGapHours} hour gap)`
            : `CGMR/T18 night (${settings.nightlyGapHours} hour gap)`
    });

    // Remove tracks that reached the play target
    if (settings.playsPerRecording > 0) {
      for (let i = active.length - 1; i >= 0; i -= 1) {
        const item = active[i];
        const count = playCounts.get(item.id) || 0;
        if (count >= settings.playsPerRecording) {
          active.splice(i, 1);
        }
      }
    }
  }

  return schedule;
};
