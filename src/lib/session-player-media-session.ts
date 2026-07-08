/**
 * Media Session API for Play Options session player — lock screen / Control Center / Android
 * notification integration (similar to NPR-style web audio). Improves OS treatment of background
 * HTML audio; does not guarantee the tab will never be suspended.
 */

import { INTRO_RELAXATION_MUSIC_LABEL } from "@/lib/intro-relaxation-music";

const ARTIST = "Reach For The Stars";
const ALBUM = "Tonight’s session";

export type SessionMediaPhase = "idle" | "first" | "waiting" | "second";

export type SessionMediaTrack = {
  title: string;
  url: string;
  skuCode?: string;
};

function displayTitle(t: SessionMediaTrack): string {
  const title = (t.title || "").trim() || "Recording";
  const sku = (t.skuCode || "").trim();
  return sku ? `${sku} – ${title}` : title;
}

function sessionArtworkUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return new URL("/covers/placeholder.svg", window.location.origin).href;
  } catch {
    return undefined;
  }
}

function formatGapCountdown(remainingSeconds: number): string {
  if (remainingSeconds >= 3600) {
    const h = Math.floor(remainingSeconds / 3600);
    const m = Math.floor((remainingSeconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  if (remainingSeconds >= 60) {
    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    return `${m}m ${s}s`;
  }
  return `${remainingSeconds}s`;
}

export type SyncSessionMediaSessionParams = {
  phase: SessionMediaPhase;
  playsPerNight: 1 | 2;
  gapHours: number;
  remainingSeconds: number;
  current: SessionMediaTrack | null;
  prep: SessionMediaTrack | null;
  isPlaying: boolean;
  audio: HTMLMediaElement | null;
};

/**
 * Update lock-screen metadata and playback state. Safe no-op when unsupported.
 */
export function syncSessionMediaSession(p: SyncSessionMediaSessionParams): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

  if (p.phase === "idle") {
    clearSessionMediaSession();
    return;
  }

  let title: string;
  let album = ALBUM;

  if (p.phase === "waiting" && p.playsPerNight === 2) {
    title = `Between recordings — next in ${formatGapCountdown(Math.max(0, p.remainingSeconds))}`;
    album = `${ALBUM} · ${p.gapHours}h gap`;
  } else if (p.current) {
    const isPrep = !!(p.prep && p.current.url === p.prep.url);
    if (isPrep) {
      title = `${INTRO_RELAXATION_MUSIC_LABEL} — ${displayTitle(p.current)}`;
    } else if (p.phase === "second") {
      title = `Second recording — ${displayTitle(p.current)}`;
    } else {
      title = `First recording — ${displayTitle(p.current)}`;
    }
  } else {
    title = "Reach For The Stars session";
  }

  try {
    const art = sessionArtworkUrl();
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: ARTIST,
      album,
      artwork: art
        ? [
            { src: art, sizes: "512x512", type: "image/svg+xml" },
            { src: art, sizes: "192x192", type: "image/svg+xml" },
            { src: art, sizes: "96x96", type: "image/svg+xml" }
          ]
        : undefined
    });
  } catch {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: ARTIST,
        album
      });
    } catch {
      // ignore
    }
  }

  try {
    navigator.mediaSession.playbackState = p.isPlaying ? "playing" : "paused";
  } catch {
    // ignore
  }

  if (p.audio && "setPositionState" in navigator.mediaSession) {
    const dur = p.audio.duration;
    if (Number.isFinite(dur) && dur > 0 && p.phase !== "waiting") {
      try {
        navigator.mediaSession.setPositionState({
          duration: dur,
          playbackRate: p.audio.playbackRate || 1,
          position: Math.min(Math.max(0, p.audio.currentTime), dur)
        });
      } catch {
        // Some browsers throw if position > duration or not seekable
      }
    } else if (p.phase === "waiting") {
      try {
        (navigator.mediaSession as MediaSessionWithOptionalPosition).setPositionState?.(null);
      } catch {
        // ignore
      }
    }
  }
}

type MediaSessionWithOptionalPosition = MediaSession & {
  setPositionState?: (state: MediaPositionState | null) => void;
};

/** Remove Now Playing integration (session fully ended or idle). */
export function clearSessionMediaSession(): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
  } catch {
    // ignore
  }
  try {
    const ms = navigator.mediaSession as MediaSessionWithOptionalPosition;
    ms.setPositionState?.(null);
  } catch {
    // ignore
  }
}

export type SessionMediaActionHandlers = {
  onPlay: () => void;
  onPause: () => void;
  /** Lock-screen / headset “stop” — end session. */
  onStop: () => void;
};

/**
 * Register play / pause / stop for OS media controls. Call cleanup on unmount or when session ends.
 */
export function registerSessionMediaSessionActionHandlers(h: SessionMediaActionHandlers): () => void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
    return () => {};
  }
  const cleanups: Array<() => void> = [];
  const trySet = (action: MediaSessionAction, fn: MediaSessionActionHandler | null) => {
    try {
      navigator.mediaSession.setActionHandler(action, fn);
      if (fn) {
        cleanups.push(() => {
          try {
            navigator.mediaSession.setActionHandler(action, null);
          } catch {
            // ignore
          }
        });
      }
    } catch {
      // ignore (unsupported action)
    }
  };
  trySet("play", () => {
    h.onPlay();
  });
  trySet("pause", () => {
    h.onPause();
  });
  trySet("stop", () => {
    h.onStop();
  });
  return () => {
    for (const u of cleanups) u();
  };
}
