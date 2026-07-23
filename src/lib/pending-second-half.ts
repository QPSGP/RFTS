/** Persist Play Options inter-half gap so Android reload/kill can recover the second audio. */

export const PENDING_SECOND_HALF_STORAGE_KEY = "rfts-pending-second-half";

/** Drop pending sessions older than this (ms). */
export const PENDING_SECOND_HALF_MAX_AGE_MS = 36 * 60 * 60 * 1000;

export type PendingSecondHalfTrack = {
  title: string;
  url: string;
  skuCode?: string;
};

export type PendingSecondHalfSession = {
  version: 1;
  secondStartAt: number;
  gapHours: number;
  firstTrack: PendingSecondHalfTrack;
  secondTrack: PendingSecondHalfTrack;
  prepAudio?: PendingSecondHalfTrack | null;
  scheduleNightNumber?: number;
  savedAt: number;
};

function isTrack(value: unknown): value is PendingSecondHalfTrack {
  if (!value || typeof value !== "object") return false;
  const t = value as PendingSecondHalfTrack;
  return typeof t.url === "string" && t.url.length > 0 && typeof t.title === "string";
}

export function isPendingSecondHalfSession(value: unknown): value is PendingSecondHalfSession {
  if (!value || typeof value !== "object") return false;
  const p = value as PendingSecondHalfSession;
  return (
    p.version === 1 &&
    typeof p.secondStartAt === "number" &&
    typeof p.gapHours === "number" &&
    typeof p.savedAt === "number" &&
    isTrack(p.firstTrack) &&
    isTrack(p.secondTrack)
  );
}

export function clearPendingSecondHalfSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENDING_SECOND_HALF_STORAGE_KEY);
  } catch {
    /* private mode / quota */
  }
}

export function savePendingSecondHalfSession(
  session: Omit<PendingSecondHalfSession, "version" | "savedAt"> & {
    savedAt?: number;
  }
): void {
  if (typeof window === "undefined") return;
  const payload: PendingSecondHalfSession = {
    version: 1,
    secondStartAt: session.secondStartAt,
    gapHours: session.gapHours,
    firstTrack: session.firstTrack,
    secondTrack: session.secondTrack,
    prepAudio: session.prepAudio ?? null,
    scheduleNightNumber: session.scheduleNightNumber,
    savedAt: session.savedAt ?? Date.now()
  };
  try {
    window.localStorage.setItem(PENDING_SECOND_HALF_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota */
  }
}

export function readPendingSecondHalfSession(
  now = Date.now()
): PendingSecondHalfSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_SECOND_HALF_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPendingSecondHalfSession(parsed)) {
      clearPendingSecondHalfSession();
      return null;
    }
    if (now - parsed.savedAt > PENDING_SECOND_HALF_MAX_AGE_MS) {
      clearPendingSecondHalfSession();
      return null;
    }
    return parsed;
  } catch {
    clearPendingSecondHalfSession();
    return null;
  }
}

export function isPendingSecondHalfDue(
  session: PendingSecondHalfSession,
  now = Date.now()
): boolean {
  return now >= session.secondStartAt;
}
