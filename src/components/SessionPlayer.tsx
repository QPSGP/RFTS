"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties
} from "react";
import NoSleep from "nosleep.js";
import {
  logMemberActivity,
  logMemberAudioOutcome,
  logMemberPlayedAudio,
  MEMBER_AUDIO_NONLINEAR_OUTCOME_MARKER
} from "@/lib/member-audio-activity";
import {
  clearSessionMediaSession,
  registerSessionMediaSessionActionHandlers,
  syncSessionMediaSession
} from "@/lib/session-player-media-session";

type SessionTrack = {
  title: string;
  url: string;
  /** Shown in member session UI and in activity when present. */
  skuCode?: string;
};

function defaultTitleFromUrl(url: string): string {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://local");
    const base = u.pathname.split("/").pop() || "recording";
    return base.replace(/\.[^.]+$/, "") || "Recording";
  } catch {
    return "Recording";
  }
}

function displayNameForSessionTrack(t: SessionTrack): string {
  const title = (t.title || "").trim() || defaultTitleFromUrl(t.url);
  const sku = (t.skuCode || "").trim();
  return sku ? `${sku} – ${title}` : title;
}

function coarseMobilePlatform(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPod/i.test(ua)) return "iOS";
  if (/iPad/i.test(ua)) return "iPad";
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return "iPadOS";
  return "desktop/other";
}

/** Tells `ScreenWakeToggle` to release the wake lock when a listening session fully stops. */
function dispatchRftsSessionEnd() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("rfts-session-end"));
  }
}

type SessionPlayerProps = {
  prepAudio?: SessionTrack | null;
  firstTrack?: SessionTrack | null;
  secondTrack?: SessionTrack | null;
  gapHours: number;
  /** 2 = full session (first + second after gap); 1 = half session — after first ends, close only; no auto second. */
  playsPerNight?: 1 | 2;
  autoStart?: boolean;
  /** Called when the member starts a session (for usage analytics). */
  onSessionStart?: () => void;
  /** Schedule night index (1-based) for the lineup being played; used when a full night finishes. */
  scheduleNightNumber?: number;
  /** Fires after the member finishes listening for this schedule night (both tracks when 2/night, or the single track when 1/night). */
  onScheduleNightComplete?: (nightNumber: number) => void;
};

export type SessionPlayerHandle = {
  startSession: () => void;
  /** Start tonight’s second recording (preparation audio first when configured). */
  playSecond: () => void;
};

type Phase = "idle" | "first" | "waiting" | "second";

/** One line for activity logs (play start + outcome); `prep` is session prep track if any. */
/**
 * Browsers may keep `currentTime` for the same stream URL. Always start new segments
 * and fresh “Start session” runs from 0. (Pause/Resume in the same visit is unchanged
 * and does not call this when the track URL is unchanged and user only hits Play again.)
 */
function startTrackFromBeginning(audio: HTMLMediaElement) {
  try {
    audio.currentTime = 0;
  } catch {
    // ignore
  }
}

/**
 * Mobile browsers often fulfill `play()` but leave the element paused without a user gesture
 * (iOS Safari, Chrome/Android WebView, Samsung Internet, etc.).
 */
function shouldVerifyAutoplayStalledByPaused(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/CriOS|FxiOS|EdgiOS/i.test(ua)) return true;
  if (/iPhone|iPod|iPad/i.test(ua)) return true;
  if (/Android/i.test(ua)) return true;
  return false;
}

/**
 * Run `play()`; on failure call onNeedTap. On many mobile browsers, `play()` can "succeed" while
 * the element stays paused—re-check after a short delay and prompt if still paused.
 * Returns a cancel function to clear follow-up timers.
 */
function startPlaybackWithIOSAutoplayGuard(
  audio: HTMLMediaElement,
  isStillValid: () => boolean,
  onNeedTap: () => void
): () => void {
  const verifyDelays = shouldVerifyAutoplayStalledByPaused() ? [220, 900] : [];
  const timers: number[] = [];
  const runIfStillPaused = () => {
    if (!isStillValid()) return;
    if (audio.paused && !audio.ended) onNeedTap();
  };
  const onPromiseFail = () => {
    if (!isStillValid()) return;
    onNeedTap();
  };
  const p = audio.play();
  if (p && typeof p.then === "function") {
    p.then(() => {
      if (!isStillValid()) return;
      for (const ms of verifyDelays) {
        timers.push(window.setTimeout(runIfStillPaused, ms));
      }
    }).catch(onPromiseFail);
  } else if (p && typeof p.catch === "function") {
    p.catch(onPromiseFail);
  }
  return () => {
    for (const id of timers) window.clearTimeout(id);
  };
}

let silentGapLoopDataUriCache: string | null = null;

/**
 * Short looping silence during the first→second gap keeps `<audio>` in a playing state for mobile autoplay handoff.
 * Uses 16-bit signed PCM at zero — correct digital silence. (Older builds used 8-bit WAV with sample bytes left at 0;
 * in unsigned 8-bit WAV silence is 128, so 0 caused DC offset / rhythmic clicks when looping — often heard as a “heartbeat”.)
 */
function getSilentGapLoopDataUri(): string {
  if (silentGapLoopDataUriCache) return silentGapLoopDataUriCache;
  if (typeof window === "undefined") return "";
  const sampleRate = 8000;
  const durationMs = 250;
  const bitsPerSample = 16;
  const numChannels = 1;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const numSamples = Math.ceil((durationMs / 1000) * sampleRate);
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buffer);
  let o = 0;
  const write = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      v.setUint8(o++, s.charCodeAt(i));
    }
  };
  write("RIFF");
  v.setUint32(o, 36 + dataSize, true);
  o += 4;
  write("WAVE");
  write("fmt ");
  v.setUint32(o, 16, true);
  o += 4;
  v.setUint16(o, 1, true);
  o += 2;
  v.setUint16(o, numChannels, true);
  o += 2;
  v.setUint32(o, sampleRate, true);
  o += 4;
  v.setUint32(o, byteRate, true);
  o += 4;
  v.setUint16(o, blockAlign, true);
  o += 2;
  v.setUint16(o, bitsPerSample, true);
  o += 2;
  write("data");
  v.setUint32(o, dataSize, true);
  o += 4;
  for (let i = 0; i < numSamples; i++) {
    v.setInt16(o, 0, true);
    o += 2;
  }
  const u8 = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  silentGapLoopDataUriCache = `data:audio/wav;base64,${window.btoa(bin)}`;
  return silentGapLoopDataUriCache;
}

function buildPlayOptionsLogLine(
  c: SessionTrack,
  ph: Phase,
  prep: SessionTrack | null
): string | null {
  if (!c?.url) return null;
  if (ph !== "first" && ph !== "second") return null;
  const label = displayNameForSessionTrack(c);
  let kind: string;
  if (prep && c.url === prep.url) {
    kind = "Preparation audio";
  } else if (ph === "second") {
    kind = `Second: ${label}`;
  } else {
    kind = `First: ${label}`;
  }
  return `Play Options - ${kind}`.replace(/\s+/g, " ").trim();
}

const SessionPlayer = forwardRef<SessionPlayerHandle, SessionPlayerProps>(function SessionPlayer(
  {
    prepAudio,
    firstTrack,
    secondTrack,
    gapHours,
    playsPerNight = 2,
    autoStart = false,
    onSessionStart,
    scheduleNightNumber,
    onScheduleNightComplete
  },
  ref
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const secondTrackRef = useRef<SessionTrack | null>(null);
  const waitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondStartAtRef = useRef<number>(0);
  const skipEffectPlayRef = useRef(false);
  const hasAutoStartedRef = useRef(false);
  /** Incremented in endSession so deferred canplay / gap timers cannot restart audio. */
  const sessionEpochRef = useRef(0);
  /** When we advance from prep to first track, store the track we're loading so "Tap play" uses it (avoids replaying prep if state is stale). */
  const pendingNextTrackRef = useRef<SessionTrack | null>(null);
  const lastAttemptAutoplayCancelRef = useRef<(() => void) | null>(null);

  const [queue, setQueue] = useState<SessionTrack[]>([]);
  const [current, setCurrent] = useState<SessionTrack | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [needsUserPlay, setNeedsUserPlay] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [onePerNightComplete, setOnePerNightComplete] = useState(false);
  /** 2 per night: both main segments finished; distinct from 1/night `onePerNightComplete`. */
  const [fullNightSessionComplete, setFullNightSessionComplete] = useState(false);
  const secondFromGapInFlightRef = useRef(false);
  /** One diag row per gap when overdue recovery happens with tab visible (explains Android lock-screen stalls). */
  const gapOverdueDiagLoggedRef = useRef(false);
  /** Android: legacy Sirius-style keep-awake while a session phase is active (complements Screen Wake Lock during the gap). */
  const noSleepRef = useRef<NoSleep | null>(null);
  const pauseForResumeRef = useRef(false);
  const suppressResumeForRestartRef = useRef(false);
  /** Last known `currentTime` for detecting forward seeks (admin activity). */
  const lastPlaybackPositionForSeekRef = useRef(0);
  secondTrackRef.current = secondTrack ?? null;

  const currentRef = useRef(current);
  const phaseRef = useRef(phase);
  const prepAudioRef = useRef(prepAudio ?? null);
  currentRef.current = current;
  phaseRef.current = phase;
  prepAudioRef.current = prepAudio ?? null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = coarseMobilePlatform();
    const mobileKeepAwake =
      p === "Android" || p === "iOS" || p === "iPad" || p === "iPadOS";
    const sessionOpen = phase !== "idle";
    if (!mobileKeepAwake || !sessionOpen) {
      noSleepRef.current?.disable();
      return;
    }
    if (!noSleepRef.current) {
      noSleepRef.current = new NoSleep();
    }
    void noSleepRef.current.enable().catch(() => {
      // Often requires a user gesture on first run; Start Session path usually satisfies it.
    });
    return () => {
      noSleepRef.current?.disable();
    };
  }, [phase]);

  /** “Now playing” and full transport — not while waiting (unless using silent gap bridge, see `sessionAudioMounted`). */
  const showActivePlaybackUi = Boolean(current && (phase === "first" || phase === "second"));
  /** Keep `<audio>` mounted during the inter-half gap: silent loop + same element handoff to second-half prep. */
  const sessionAudioMounted =
    showActivePlaybackUi || (phase === "waiting" && playsPerNight === 2);

  /** Lock screen / Control Center / Android media surface — improves background HTML audio. */
  useEffect(() => {
    syncSessionMediaSession({
      phase,
      playsPerNight,
      gapHours,
      remainingSeconds,
      current,
      prep: prepAudio ?? null,
      isPlaying,
      audio: audioRef.current
    });
  }, [
    phase,
    playsPerNight,
    gapHours,
    remainingSeconds,
    current,
    prepAudio,
    isPlaying,
    sessionAudioMounted
  ]);

  /** Refresh scrubber position on lock screen while playing (metadata title already updates from state). */
  useEffect(() => {
    if (phase === "idle" || phase === "waiting" || !isPlaying || !sessionAudioMounted) {
      return;
    }
    const id = window.setInterval(() => {
      syncSessionMediaSession({
        phase: phaseRef.current,
        playsPerNight,
        gapHours,
        remainingSeconds,
        current: currentRef.current,
        prep: prepAudioRef.current,
        isPlaying: true,
        audio: audioRef.current
      });
    }, 8000);
    return () => window.clearInterval(id);
  }, [phase, isPlaying, sessionAudioMounted, playsPerNight, gapHours, remainingSeconds]);

  /** useLayoutEffect + play/playing: attach before paint, log on the first event some browsers only emit. */
  useLayoutEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlaybackLogged = () => {
      if (phaseRef.current === "waiting") return;
      const c = currentRef.current;
      const ph = phaseRef.current;
      const prep = prepAudioRef.current;
      const line = c ? buildPlayOptionsLogLine(c, ph, prep) : null;
      if (line) {
        // ASCII " - " keeps DB/API UTF-8 handling simple; Admin parses this and em-dash variants.
        logMemberPlayedAudio(line);
      }
    };
    audio.addEventListener("playing", onPlaybackLogged);
    audio.addEventListener("play", onPlaybackLogged);
    return () => {
      audio.removeEventListener("playing", onPlaybackLogged);
      audio.removeEventListener("play", onPlaybackLogged);
    };
    /* `<audio>` mounts only when `sessionAudioMounted` is true, so a [] effect ran on first
     * paint with ref still null and never re-ran — session `played_audio` was never logged. */
  }, [sessionAudioMounted, current?.url, phase, prepAudio?.url]);

  useLayoutEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPause = () => {
      if (phaseRef.current === "first" || phaseRef.current === "second") {
        pauseForResumeRef.current = true;
      }
    };
    const onPlay = () => {
      if (suppressResumeForRestartRef.current) {
        suppressResumeForRestartRef.current = false;
        return;
      }
      if (!pauseForResumeRef.current) return;
      pauseForResumeRef.current = false;
      if (audio.currentTime < 1) return;
      const c = currentRef.current;
      const ph = phaseRef.current;
      const prep = prepAudioRef.current;
      const line = c ? buildPlayOptionsLogLine(c, ph, prep) : null;
      if (line) {
        logMemberAudioOutcome(`${line} | resumed from where they left off`);
      }
    };
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    return () => {
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [sessionAudioMounted, current?.url, phase, prepAudio?.url]);

  /** Between first and second half (2/night): loop inaudible WAV so the media element stays active for autoplay. */
  useLayoutEffect(() => {
    if (phase !== "waiting" || playsPerNight !== 2) return;
    const audio = audioRef.current;
    if (!audio) return;
    const silent = getSilentGapLoopDataUri();
    if (!silent) return;
    const epoch = sessionEpochRef.current;
    audio.loop = true;
    audio.volume = 0;
    audio.muted = true;
    if (audio.src !== silent) {
      audio.src = silent;
      audio.load();
    }
    const cancel = startPlaybackWithIOSAutoplayGuard(
      audio,
      () => sessionEpochRef.current === epoch && phaseRef.current === "waiting",
      () => {
        setMessage("Tap Play once so the silent bridge can keep this page ready for your second audio.");
        setNeedsUserPlay(true);
      }
    );
    return () => cancel();
  }, [phase, playsPerNight]);

  useEffect(() => {
    pauseForResumeRef.current = false;
  }, [current?.url]);

  const attemptPlay = (track?: SessionTrack | null) => {
    const audio = audioRef.current;
    if (!audio || !track) {
      return;
    }
    audio.muted = false;
    if (audio.src !== track.url) {
      audio.src = track.url;
    }
    lastAttemptAutoplayCancelRef.current?.();
    const trackUrl = track.url;
    const epoch0 = sessionEpochRef.current;
    const isValid = () =>
      sessionEpochRef.current === epoch0 && currentRef.current?.url === trackUrl;
    startTrackFromBeginning(audio);
    lastAttemptAutoplayCancelRef.current = startPlaybackWithIOSAutoplayGuard(
      audio,
      isValid,
      () => {
        setMessage(
          phaseRef.current === "second"
            ? "Tap play to start the second half (preparation, then your second track)."
            : "Tap play to start the session."
        );
        setNeedsUserPlay(true);
      }
    );
  };

  const startSession = useCallback(() => {
    if (!firstTrack) {
      setMessage("Select goals to build your session lineup.");
      return;
    }
    /** Always start tonight’s session from prep (or first) at 0, not mid–first main. */
    pendingNextTrackRef.current = null;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("rfts-session-start"));
    }
    onSessionStart?.();
    setOnePerNightComplete(false);
    setFullNightSessionComplete(false);
    secondFromGapInFlightRef.current = false;
    setPhase("first");
    const nextQueue = [prepAudio, firstTrack].filter(
      (track): track is SessionTrack => !!track
    );
    // Only skip the `current` effect when `<audio>` is already mounted and attemptPlay will run; otherwise the effect must start playback after mount (e.g. first load, gap/waiting → second).
    skipEffectPlayRef.current = Boolean(audioRef.current);
    setQueue(nextQueue);
    setCurrent(nextQueue[0] || null);
    setMessage(null);
    setNeedsUserPlay(false);
    attemptPlay(nextQueue[0]);
  }, [firstTrack, prepAudio, onSessionStart]);

  const playSecond = useCallback(() => {
    if (!secondTrack) {
      setMessage("No second recording scheduled tonight.");
      return;
    }
    if (waitTimeoutRef.current) {
      clearTimeout(waitTimeoutRef.current);
      waitTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    pendingNextTrackRef.current = null;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("rfts-session-start"));
    }
    setPhase("second");
    const nextQueue = [prepAudio, secondTrack].filter(
      (track): track is SessionTrack => !!track
    );
    skipEffectPlayRef.current = Boolean(audioRef.current);
    setQueue(nextQueue);
    setCurrent(nextQueue[0] || null);
    setMessage(null);
    setNeedsUserPlay(false);
    attemptPlay(nextQueue[0]);
  }, [secondTrack, prepAudio]);

  useImperativeHandle(ref, () => ({ startSession, playSecond }), [startSession, playSecond]);

  /** Layout phase so `<audio ref>` is attached before play(); fixes gap→second half silent failures on mobile. */
  useLayoutEffect(() => {
    if (skipEffectPlayRef.current) {
      skipEffectPlayRef.current = false;
      return;
    }
    const audio = audioRef.current;
    if (!audio || !current) {
      return;
    }
    if (audio.src !== current.url) {
      audio.src = current.url;
    }
    const urlAtStart = current.url;
    const epochAtStart = sessionEpochRef.current;
    let cancelAutoplayCheck: (() => void) | null = null;
    const playFromZero = () => {
      cancelAutoplayCheck?.();
      const trackUrl = urlAtStart;
      const isValid = () =>
        sessionEpochRef.current === epochAtStart && currentRef.current?.url === trackUrl;
      audio.loop = false;
      audio.volume = 1;
      audio.muted = false;
      startTrackFromBeginning(audio);
      cancelAutoplayCheck = startPlaybackWithIOSAutoplayGuard(
        audio,
        isValid,
        () => {
          setMessage(
            phaseRef.current === "second"
              ? "Tap play to start the second half (preparation, then your second track)."
              : "Tap play to start the session."
          );
          setNeedsUserPlay(true);
        }
      );
    };
    if (audio.readyState >= 1) {
      playFromZero();
    } else {
      audio.addEventListener("canplay", () => playFromZero(), { once: true });
    }
    return () => {
      cancelAutoplayCheck?.();
    };
  }, [current]);

  useEffect(() => {
    if (autoStart && firstTrack && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      startSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, firstTrack?.url]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia("(max-width: 768px)");
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !sessionAudioMounted) return;
    const onTimeUpdate = () => {
      lastPlaybackPositionForSeekRef.current = audio.currentTime;
    };
    const onLoadedMetadata = () => {
      lastPlaybackPositionForSeekRef.current = audio.currentTime;
    };
    const onSeeked = () => {
      const ph = phaseRef.current;
      if (ph !== "first" && ph !== "second") return;
      const c = currentRef.current;
      if (!c?.url) return;
      const prev = lastPlaybackPositionForSeekRef.current;
      const now = audio.currentTime;
      if (now <= prev + 3.5) return;
      if (now < 2) return;
      const line = buildPlayOptionsLogLine(c, ph, prepAudioRef.current);
      if (!line) return;
      logMemberAudioOutcome(`${line} | ${MEMBER_AUDIO_NONLINEAR_OUTCOME_MARKER}`);
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("seeked", onSeeked);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("seeked", onSeeked);
    };
  }, [sessionAudioMounted, current?.url, phase, prepAudio?.url]);

  const clearWaitTimers = useCallback(() => {
    if (waitTimeoutRef.current) {
      clearTimeout(waitTimeoutRef.current);
      waitTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const beginSecondAfterGap = useCallback((trigger?: string) => {
    if (phaseRef.current !== "waiting") return;
    if (secondFromGapInFlightRef.current) return;
    secondFromGapInFlightRef.current = true;
    const tr = secondTrackRef.current;
    clearWaitTimers();
    if (!tr) {
      secondFromGapInFlightRef.current = false;
      setMessage(
        "No second recording was scheduled. Reload Play Options or check your lineup has two tracks for tonight."
      );
      setPhase("idle");
      dispatchRftsSessionEnd();
      return;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("rfts-second-half-started"));
    }
    if (trigger && typeof window !== "undefined") {
      const vis = typeof document !== "undefined" ? document.visibilityState : "?";
      logMemberActivity(
        "session_gap",
        `Second half auto-start | trigger=${trigger} visibility=${vis} platform=${coarseMobilePlatform()}`
      );
    }
    const prep = prepAudioRef.current;
    const nextQueue = [prep, tr].filter(
      (track): track is SessionTrack => !!track
    );
    setPhase("second");
    setQueue(nextQueue);
    setCurrent(nextQueue[0] || null);
    setMessage(null);
    setNeedsUserPlay(false);
    // `<audio>` was unmounted during "waiting" — do not set skipEffectPlayRef; the `current` effect starts playback.
  }, [prepAudio, clearWaitTimers]);

  /**
   * Android often freezes long `setTimeout` / `setInterval` while the screen is locked; the second half then
   * appeared to start only on unlock. `timeupdate` follows the playing silent bridge and often keeps waking
   * this check even when main-thread timers are stalled.
   */
  useLayoutEffect(() => {
    if (phase !== "waiting" || playsPerNight !== 2) return;
    const audio = audioRef.current;
    if (!audio) return;
    const gapEpoch = sessionEpochRef.current;
    const bumpSecondHalfIfDue = () => {
      if (sessionEpochRef.current !== gapEpoch) return;
      if (phaseRef.current !== "waiting") return;
      if (Date.now() < secondStartAtRef.current) return;
      beginSecondAfterGap("timeupdate");
    };
    audio.addEventListener("timeupdate", bumpSecondHalfIfDue);
    return () => audio.removeEventListener("timeupdate", bumpSecondHalfIfDue);
  }, [phase, playsPerNight, beginSecondAfterGap]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined" || phase !== "waiting") {
      return;
    }
    const gapEpoch = sessionEpochRef.current;
    const tryResumeSecondHalf = (trigger: string) => {
      if (sessionEpochRef.current !== gapEpoch) return;
      if (phaseRef.current !== "waiting") return;
      if (Date.now() < secondStartAtRef.current) return;
      const now = Date.now();
      const due = secondStartAtRef.current;
      if (
        !gapOverdueDiagLoggedRef.current &&
        now >= due + 60_000 &&
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        gapOverdueDiagLoggedRef.current = true;
        const minsLate = Math.round((now - due) / 60000);
        logMemberActivity(
          "session_gap",
          `Diag: second half was ${minsLate}m past schedule when tab became visible — JS timers / silent bridge often stall when the screen is locked (common on Android). Android now auto-enables screen wake during the gap when supported; if issues persist use Enable Screen Wake on Play Options or keep Chrome in the foreground.`
        );
      }
      beginSecondAfterGap(trigger);
    };
    /** Run on hidden too: if the deadline passed while locked, start the second half without waiting for unlock. */
    const onVisibility = () => {
      tryResumeSecondHalf(
        typeof document !== "undefined" && document.visibilityState === "visible"
          ? "visibility_visible"
          : "visibility_hidden"
      );
    };
    /** bfcache restore / tab wake — long gap timers can be unreliable without this */
    const onPageShow = () => {
      tryResumeSecondHalf("pageshow");
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [phase, beginSecondAfterGap]);

  useEffect(() => {
    return () => clearWaitTimers();
  }, [clearWaitTimers]);

  /** Stop playback, clear UI, cancel gap countdown (so second track will not auto-start). */
  const endSession = useCallback(() => {
    const cEnd = currentRef.current;
    const phEnd = phaseRef.current;
    const prepEnd = prepAudioRef.current;
    const audio = audioRef.current;
    if (
      cEnd &&
      (phEnd === "first" || phEnd === "second") &&
      audio &&
      !audio.ended
    ) {
      const line = buildPlayOptionsLogLine(cEnd, phEnd, prepEnd);
      if (line) {
        const dur = audio.duration;
        let incomplete = true;
        if (Number.isFinite(dur) && dur > 0) {
          incomplete = audio.currentTime / dur < 0.98;
        } else {
          incomplete = audio.currentTime < 0.5;
        }
        if (incomplete && audio.currentTime > 0.15) {
          logMemberAudioOutcome(`${line} | stopped before end (did not complete)`);
        }
      }
    }
    sessionEpochRef.current += 1;
    secondFromGapInFlightRef.current = false;
    clearWaitTimers();
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    pendingNextTrackRef.current = null;
    skipEffectPlayRef.current = false;
    setIsPlaying(false);
    setNeedsUserPlay(false);
    setFullNightSessionComplete(false);
    setPhase("idle");
    setQueue([]);
    setCurrent(null);
    setMessage("Session ended. You can start again when you’re ready.");
    clearSessionMediaSession();
    dispatchRftsSessionEnd();
  }, [clearWaitTimers]);

  const handleEnded = useCallback(() => {
    {
      const c0 = currentRef.current;
      const ph0 = phaseRef.current;
      const prep0 = prepAudioRef.current;
      if (c0) {
        const line = buildPlayOptionsLogLine(c0, ph0, prep0);
        if (line) {
          logMemberAudioOutcome(`${line} | completed full listen`);
        }
      }
    }
    if (queue.length > 1) {
      const epochAtAdvance = sessionEpochRef.current;
      const [, ...rest] = queue;
      const nextTrack = rest[0] || null;
      setQueue(rest);
      setCurrent(nextTrack);
      pendingNextTrackRef.current = nextTrack;
      skipEffectPlayRef.current = true;
      const audio = audioRef.current;
      if (nextTrack && audio) {
        audio.src = nextTrack.url;
        audio.load();
        const playWhenReady = () => {
          if (epochAtAdvance !== sessionEpochRef.current) return;
          clearTimeout(fallbackId);
          pendingNextTrackRef.current = null;
          startTrackFromBeginning(audio);
          startPlaybackWithIOSAutoplayGuard(
            audio,
            () => epochAtAdvance === sessionEpochRef.current,
            () => {
              setMessage(
                phaseRef.current === "second"
                  ? "Tap play to start the second half (preparation, then your second track)."
                  : "Tap play to start the session."
              );
              setNeedsUserPlay(true);
            }
          );
        };
        const fallbackId = setTimeout(() => {
          if (epochAtAdvance !== sessionEpochRef.current) return;
          setNeedsUserPlay(true);
          setMessage("Tap play to start the session.");
        }, 3000);
        audio.addEventListener("canplaythrough", playWhenReady, { once: true });
        audio.addEventListener(
          "error",
          () => {
            if (epochAtAdvance !== sessionEpochRef.current) return;
            clearTimeout(fallbackId);
            setMessage("Tap play to start playback.");
            setNeedsUserPlay(true);
          },
          { once: true }
        );
      }
      return;
    }
    // Last track in queue just ended — close and optionally queue second (only when 2 per night)
    const hasSecond = !!secondTrackRef.current;
    const doSecondAfterGap = playsPerNight === 2 && phase === "first" && hasSecond;
    if (doSecondAfterGap) {
      secondFromGapInFlightRef.current = false;
      clearWaitTimers();
      setIsPlaying(false);
      setNeedsUserPlay(false);
      setQueue([]);
      setCurrent(null);
      setPhase("waiting");
      /** Lets ScreenWakeToggle re-request wake lock right before the long gap (Android timer/sleep issues). */
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("rfts-inter-half-gap"));
      }
      const gapMs = gapHours * 60 * 60 * 1000;
      secondStartAtRef.current = Date.now() + gapMs;
      gapOverdueDiagLoggedRef.current = false;
      logMemberActivity(
        "session_gap",
        `Inter-half gap started | gap_hours=${gapHours} second_scheduled_utc=${new Date(secondStartAtRef.current).toISOString()} platform=${coarseMobilePlatform()}`
      );
      setRemainingSeconds(Math.round(gapMs / 1000));
      countdownIntervalRef.current = setInterval(() => {
        const left = Math.max(0, Math.round((secondStartAtRef.current - Date.now()) / 1000));
        setRemainingSeconds(left);
        /** Backup if long `setTimeout` was throttled or dropped (mobile background). */
        if (phaseRef.current === "waiting" && Date.now() >= secondStartAtRef.current) {
          beginSecondAfterGap("interval");
        }
      }, 1000);
      const epochAtGapStart = sessionEpochRef.current;
      waitTimeoutRef.current = setTimeout(() => {
        if (epochAtGapStart !== sessionEpochRef.current) return;
        beginSecondAfterGap("timeout");
      }, gapMs);
    } else {
      const nightFullyListened =
        playsPerNight === 1 ||
        phase === "second" ||
        (phase === "first" && !hasSecond);
      if (
        nightFullyListened &&
        typeof scheduleNightNumber === "number" &&
        scheduleNightNumber >= 1 &&
        onScheduleNightComplete
      ) {
        onScheduleNightComplete(scheduleNightNumber);
      }
      if (nightFullyListened && playsPerNight === 2) {
        setFullNightSessionComplete(true);
      }
      // Single track (or last of queue) ended — stop and clear so it doesn't repeat; 1 per night = cued for next night
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      setIsPlaying(false);
      setNeedsUserPlay(false);
      setPhase("idle");
      setQueue([]);
      setCurrent(null);
      if (playsPerNight === 1) {
        setOnePerNightComplete(true);
      }
      dispatchRftsSessionEnd();
    }
  }, [phase, gapHours, playsPerNight, queue, clearWaitTimers, prepAudio, scheduleNightNumber, onScheduleNightComplete, beginSecondAfterGap]);

  const handlePause = () => {
    audioRef.current?.pause();
  };

  const handlePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const toPlay = pendingNextTrackRef.current || current;
    if (toPlay) {
      const epochAtPlay = sessionEpochRef.current;
      audio.src = toPlay.url;
      audio.load();
      if (pendingNextTrackRef.current) pendingNextTrackRef.current = null;
      const onCanPlay = () => {
        if (epochAtPlay !== sessionEpochRef.current) return;
        audio.removeEventListener("error", onError);
        startTrackFromBeginning(audio);
        audio
          .play()
          .then(() => {
            if (epochAtPlay !== sessionEpochRef.current) return;
            setNeedsUserPlay(false);
            setMessage(null);
          })
          .catch(() => setNeedsUserPlay(true));
      };
      const onError = () => {
        if (epochAtPlay !== sessionEpochRef.current) return;
        audio.removeEventListener("canplaythrough", onCanPlay);
        setMessage("Tap play to start playback.");
        setNeedsUserPlay(true);
      };
      audio.addEventListener("canplaythrough", onCanPlay, { once: true });
      audio.addEventListener("error", onError, { once: true });
      audio
        .play()
        .then(() => {
          if (epochAtPlay !== sessionEpochRef.current) return;
          setNeedsUserPlay(false);
          setMessage(null);
        })
        .catch(() => {});
      return;
    }
    const epochResume = sessionEpochRef.current;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          if (epochResume !== sessionEpochRef.current) return;
          setNeedsUserPlay(false);
          setMessage(null);
        })
        .catch(() => setNeedsUserPlay(true));
    }
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const c0 = currentRef.current;
    const ph0 = phaseRef.current;
    const prep0 = prepAudioRef.current;
    if (c0) {
      const line = buildPlayOptionsLogLine(c0, ph0, prep0);
      if (line) {
        suppressResumeForRestartRef.current = true;
        logMemberAudioOutcome(`${line} | restarted from the beginning`);
      }
    }
    audio.currentTime = 0;
    void audio.play();
  };

  const handlePlayRef = useRef(handlePlay);
  const handlePauseRef = useRef(handlePause);
  const endSessionRef = useRef(endSession);
  handlePlayRef.current = handlePlay;
  handlePauseRef.current = handlePause;
  endSessionRef.current = endSession;

  useEffect(() => {
    const unregister = registerSessionMediaSessionActionHandlers({
      onPlay: () => {
        handlePlayRef.current();
      },
      onPause: () => {
        handlePauseRef.current();
      },
      onStop: () => {
        endSessionRef.current();
      }
    });
    return () => {
      unregister();
      clearSessionMediaSession();
    };
  }, []);

  const audioSurfaceStyle: CSSProperties =
    showActivePlaybackUi && current
      ? { width: "100%", marginTop: 8, display: "block" }
      : sessionAudioMounted
        ? {
            display: "block",
            position: "fixed",
            width: 4,
            height: 4,
            bottom: 0,
            right: 0,
            opacity: 0.02,
            pointerEvents: "none",
            clipPath: "inset(50%)"
          }
        : { display: "none" };

  return (
    <div className="card">
      <h3>Tonight&apos;s Audio</h3>
      <p style={{ color: "#4b5563" }}>
        {playsPerNight === 1
          ? "Plays a short preparation audio, then your goal audio for tonight. Your next audio is scheduled for tomorrow."
          : `Plays a short preparation audio, then your first goal audio. The second audio is scheduled ${gapHours} hours later and also begins with preparation audio when you play it.`}
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="button" onClick={startSession}>
          Start Session
        </button>
        {secondTrack && (
          <button className="button button-secondary" onClick={playSecond}>
            Play Second Audio
          </button>
        )}
      </div>
      {message && <p style={{ marginTop: 12 }}>{message}</p>}
      {onePerNightComplete && playsPerNight === 1 && (
        <div className="card" style={{ marginTop: 16, background: "#f0fdf4", borderColor: "#22c55e" }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#166534" }}>Session complete.</p>
          <p style={{ margin: "8px 0 0", color: "#15803d" }}>
            Your next audio is cued for tomorrow. Start Session when you&apos;re ready.
          </p>
        </div>
      )}
      {fullNightSessionComplete && playsPerNight === 2 && (
        <div className="card" style={{ marginTop: 16, background: "#f0fdf4", borderColor: "#22c55e" }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#166534" }}>Tonight&apos;s session is complete.</p>
          <p style={{ margin: "8px 0 0", color: "#15803d" }}>
            Both of tonight&apos;s goal audios have finished. The player is closed; use Start Session the next time you listen.
          </p>
        </div>
      )}
      {phase === "waiting" && (
        <div className="card" style={{ marginTop: 16, background: "#f0fdf4", borderColor: "#22c55e" }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#166534" }}>First session complete.</p>
          <p style={{ margin: "8px 0 0", color: "#15803d" }}>
            Second recording will start in{" "}
            {remainingSeconds >= 3600
              ? `${Math.floor(remainingSeconds / 3600)}h ${Math.floor((remainingSeconds % 3600) / 60)}m`
              : remainingSeconds >= 60
                ? `${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s`
                : `${remainingSeconds}s`}
            . It will begin and close automatically.
          </p>
          {isMobile && (
            <p style={{ margin: "10px 0 0", color: "#15803d" }}>
              On a phone, tap Play if the second half (including preparation) does not start when the wait ends.
            </p>
          )}
          {coarseMobilePlatform() === "Android" && (
            <p style={{ margin: "10px 0 0", color: "#92400e", fontSize: 13 }}>
              If the second recording only starts after you unlock your phone, turn on <strong>Enable Screen Wake</strong> on this page or keep Chrome in the foreground — Android often pauses long timers while the screen is off.
            </p>
          )}
          <button
            type="button"
            className="button button-secondary"
            onClick={endSession}
            style={{ marginTop: 14, borderColor: "#64748b", color: "#334155" }}
          >
            End session — cancel second recording
          </button>
        </div>
      )}
      {sessionAudioMounted && (
        <div style={{ marginTop: 16 }}>
          {showActivePlaybackUi && current && (
            <>
              <strong>Now Playing: {displayNameForSessionTrack(current)}</strong>
              {!isMobile && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                  <button
                    className="button button-secondary"
                    onClick={handlePause}
                    type="button"
                    style={{ background: "#dc2626", color: "#fff", borderColor: "#dc2626" }}
                  >
                    Pause
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={handlePlay}
                    type="button"
                    disabled={isPlaying}
                    style={{ background: "#16a34a", color: "#fff", borderColor: "#16a34a" }}
                  >
                    Play
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={handleRestart}
                    type="button"
                    style={{ background: "#eab308", color: "#1f2937", borderColor: "#eab308" }}
                  >
                    Restart
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={endSession}
                    type="button"
                    style={{ borderColor: "#64748b", color: "#334155" }}
                  >
                    End session
                  </button>
                </div>
              )}
              {isMobile && <div style={{ height: 280 }} />}
            </>
          )}
          {phase === "waiting" && playsPerNight === 2 && (
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8, marginTop: 0 }}>
              Silent playback runs until your second audio starts (nothing audible — it keeps the session active on phones).
            </p>
          )}
          <audio
            key="rfts-session-audio"
            ref={audioRef}
            playsInline
            controls={Boolean(showActivePlaybackUi && current)}
            controlsList="nodownload"
            onEnded={handleEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            style={audioSurfaceStyle}
          />
          {needsUserPlay && (
            <>
              <div className="card" style={{ marginTop: 12 }}>
                <p style={{ color: "#b91c1c", marginTop: 0 }}>
                  Tap below to start playback (required on most phones).
                </p>
                <button
                  className="button"
                  type="button"
                  onClick={handlePlay}
                  style={{ padding: "18px 24px", fontSize: 18, minHeight: 56, width: "100%" }}
                >
                  Play Session
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={endSession}
                  style={{ marginTop: 10, width: "100%" }}
                >
                  End session
                </button>
              </div>
              {isMobile && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest("button, a")) return;
                    handlePlay();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      if ((event.target as HTMLElement).closest("button, a")) return;
                      handlePlay();
                    }
                  }}
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(15, 23, 42, 0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 100
                  }}
                >
                  <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
                    <h3 style={{ marginTop: 0 }}>Tap to Start Audio</h3>
                    <p style={{ color: "#4b5563" }}>
                      This device may need a tap to begin playback.
                    </p>
                    <button
                      className="button"
                      type="button"
                      onClick={handlePlay}
                      style={{
                        padding: "18px 24px",
                        fontSize: 18,
                        minHeight: 56,
                        width: "100%"
                      }}
                    >
                      Start Playback
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={endSession}
                      style={{ marginTop: 12, width: "100%" }}
                    >
                      End session
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {isMobile && (
            <div
              style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 50,
                background: "#ffffff",
                boxShadow: "0 -6px 18px rgba(15, 23, 42, 0.12)",
                padding: "12px 16px 16px"
              }}
            >
              <div
                style={{
                  marginBottom: 12,
                  paddingBottom: 12,
                  borderBottom: "1px solid #e5e7eb",
                  fontSize: 14,
                  color: "#4b5563"
                }}
              >
                <strong style={{ display: "block", marginBottom: 6, color: "#111827" }}>
                  Meditation session
                </strong>
                {prepAudio && (
                  <div style={{ marginBottom: 2 }}>
                    Prep: {displayNameForSessionTrack(prepAudio)}
                    {current?.url === prepAudio.url && " (now playing)"}
                  </div>
                )}
                {firstTrack && (
                  <div style={{ marginBottom: 2 }}>
                    First: {displayNameForSessionTrack(firstTrack)}
                    {current?.url === firstTrack.url && " (now playing)"}
                  </div>
                )}
                {secondTrack && playsPerNight === 2 && (
                  <div>
                    Second: {displayNameForSessionTrack(secondTrack)}
                    {current?.url === secondTrack.url && " (now playing)"}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  justifyContent: "center"
                }}
              >
                <button
                  className="button button-secondary"
                  onClick={handlePause}
                  type="button"
                  style={{
                    padding: "18px 24px",
                    fontSize: 18,
                    minHeight: 56,
                    flex: 1,
                    minWidth: 120,
                    background: "#dc2626",
                    color: "#fff",
                    borderColor: "#dc2626"
                  }}
                >
                  Pause
                </button>
                <button
                  className="button button-secondary"
                  onClick={handlePlay}
                  type="button"
                  disabled={isPlaying}
                  style={{
                    padding: "18px 24px",
                    fontSize: 18,
                    minHeight: 56,
                    flex: 1,
                    minWidth: 120,
                    background: "#16a34a",
                    color: "#fff",
                    borderColor: "#16a34a"
                  }}
                >
                  Play
                </button>
                <button
                  className="button button-secondary"
                  onClick={handleRestart}
                  type="button"
                  style={{
                    padding: "18px 24px",
                    fontSize: 18,
                    minHeight: 56,
                    flex: 1,
                    minWidth: 120,
                    background: "#eab308",
                    color: "#1f2937",
                    borderColor: "#eab308"
                  }}
                >
                  Restart
                </button>
              </div>
              <button
                type="button"
                className="button button-secondary"
                onClick={endSession}
                style={{
                  marginTop: 10,
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: 16,
                  borderColor: "#64748b",
                  color: "#334155"
                }}
              >
                End session
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

SessionPlayer.displayName = "SessionPlayer";

export default SessionPlayer;
