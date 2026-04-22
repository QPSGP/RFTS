"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { logMemberPlayedAudio } from "@/lib/member-audio-activity";

type SessionTrack = {
  title: string;
  url: string;
};

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

  const [queue, setQueue] = useState<SessionTrack[]>([]);
  const [current, setCurrent] = useState<SessionTrack | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [needsUserPlay, setNeedsUserPlay] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [onePerNightComplete, setOnePerNightComplete] = useState(false);

  secondTrackRef.current = secondTrack ?? null;

  const currentRef = useRef(current);
  const phaseRef = useRef(phase);
  const prepAudioRef = useRef(prepAudio ?? null);
  currentRef.current = current;
  phaseRef.current = phase;
  prepAudioRef.current = prepAudio ?? null;

  /** Pause/Play/Restart, native audio, and mobile fixed bar only while actively in first or second segment (not idle/waiting). */
  const showActivePlaybackUi = Boolean(current && (phase === "first" || phase === "second"));

  /** useLayoutEffect + play/playing: attach before paint, log on the first event some browsers only emit. */
  useLayoutEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlaybackLogged = () => {
      const c = currentRef.current;
      if (!c?.url) return;
      const ph = phaseRef.current;
      if (ph !== "first" && ph !== "second") return;
      const prep = prepAudioRef.current;
      const label =
        (c.title || "").trim() ||
        (() => {
          try {
            const u = new URL(c.url, typeof window !== "undefined" ? window.location.origin : "http://local");
            const base = u.pathname.split("/").pop() || "recording";
            return base.replace(/\.[^.]+$/, "") || "Recording";
          } catch {
            return "Recording";
          }
        })();
      let kind: string;
      if (prep && c.url === prep.url) {
        kind = "Preparation audio";
      } else if (ph === "second") {
        kind = `Second: ${label}`;
      } else {
        kind = `First: ${label}`;
      }
      // ASCII " - " keeps DB/API UTF-8 handling simple; Admin parses this and em-dash variants.
      logMemberPlayedAudio(`Play Options - ${kind}`.replace(/\s+/g, " ").trim());
    };
    audio.addEventListener("playing", onPlaybackLogged);
    audio.addEventListener("play", onPlaybackLogged);
    return () => {
      audio.removeEventListener("playing", onPlaybackLogged);
      audio.removeEventListener("play", onPlaybackLogged);
    };
    /* `<audio>` mounts only when `showActivePlaybackUi` is true, so a [] effect ran on first
     * paint with ref still null and never re-ran — session `played_audio` was never logged. */
  }, [showActivePlaybackUi, current?.url, phase, prepAudio?.url]);

  const attemptPlay = (track?: SessionTrack | null) => {
    const audio = audioRef.current;
    if (!audio || !track) {
      return;
    }
    if (audio.src !== track.url) {
      audio.src = track.url;
    }
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        setMessage("Tap play to start the session.");
        setNeedsUserPlay(true);
      });
    }
  };

  const startSession = useCallback(() => {
    if (!firstTrack) {
      setMessage("Select goals to build your session lineup.");
      return;
    }
    if (phase === "first" && current && prepAudio?.url && current.url !== prepAudio.url) {
      attemptPlay(current);
      return;
    }
    pendingNextTrackRef.current = null;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("rfts-session-start"));
    }
    onSessionStart?.();
    setOnePerNightComplete(false);
    setPhase("first");
    const nextQueue = [prepAudio, firstTrack].filter(
      (track): track is SessionTrack => !!track
    );
    setQueue(nextQueue);
    setCurrent(nextQueue[0] || null);
    setMessage(null);
    setNeedsUserPlay(false);
    attemptPlay(nextQueue[0]);
  }, [firstTrack, prepAudio, onSessionStart, phase, current]);

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
    setPhase("second");
    const nextQueue = [prepAudio, secondTrack].filter(
      (track): track is SessionTrack => !!track
    );
    setQueue(nextQueue);
    setCurrent(nextQueue[0] || null);
    setMessage(null);
    setNeedsUserPlay(false);
    attemptPlay(nextQueue[0]);
  }, [secondTrack, prepAudio]);

  useImperativeHandle(ref, () => ({ startSession, playSecond }), [startSession, playSecond]);

  useEffect(() => {
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
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        setMessage("Tap play to start the session.");
        setNeedsUserPlay(true);
      });
    }
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

  useEffect(() => {
    return () => clearWaitTimers();
  }, [clearWaitTimers]);

  /** Stop playback, clear UI, cancel gap countdown (so second track will not auto-start). */
  const endSession = useCallback(() => {
    sessionEpochRef.current += 1;
    clearWaitTimers();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    pendingNextTrackRef.current = null;
    skipEffectPlayRef.current = false;
    setIsPlaying(false);
    setNeedsUserPlay(false);
    setPhase("idle");
    setQueue([]);
    setCurrent(null);
    setMessage("Session ended. You can start again when you’re ready.");
  }, [clearWaitTimers]);

  const handleEnded = useCallback(() => {
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
          audio.play().catch(() => {
            setMessage("Tap play to start the session.");
            setNeedsUserPlay(true);
          });
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
        audio.play().catch(() => {});
      }
      return;
    }
    // Last track in queue just ended — close and optionally queue second (only when 2 per night)
    const hasSecond = !!secondTrackRef.current;
    const doSecondAfterGap = playsPerNight === 2 && phase === "first" && hasSecond;
    if (doSecondAfterGap) {
      clearWaitTimers();
      setIsPlaying(false);
      setNeedsUserPlay(false);
      setQueue([]);
      setCurrent(null);
      setPhase("waiting");
      const gapMs = gapHours * 60 * 60 * 1000;
      secondStartAtRef.current = Date.now() + gapMs;
      setRemainingSeconds(Math.round(gapMs / 1000));
      countdownIntervalRef.current = setInterval(() => {
        const left = Math.max(0, Math.round((secondStartAtRef.current - Date.now()) / 1000));
        setRemainingSeconds(left);
      }, 1000);
      const epochAtGapStart = sessionEpochRef.current;
      waitTimeoutRef.current = setTimeout(() => {
        if (epochAtGapStart !== sessionEpochRef.current) return;
        clearWaitTimers();
        const tr = secondTrackRef.current;
        if (tr) {
          const nextQueue = [prepAudio, tr].filter(
            (track): track is SessionTrack => !!track
          );
          setPhase("second");
          setQueue(nextQueue);
          setCurrent(nextQueue[0] || null);
          setMessage(null);
          setNeedsUserPlay(false);
          const audio = audioRef.current;
          const first = nextQueue[0];
          if (audio && first) {
            audio.src = first.url;
            audio.play().catch(() => setNeedsUserPlay(true));
          }
        } else {
          setPhase("idle");
        }
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
    }
  }, [phase, gapHours, playsPerNight, queue, clearWaitTimers, prepAudio, scheduleNightNumber, onScheduleNightComplete]);

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
    audio.currentTime = 0;
    audio.play();
  };

  return (
    <div className="card">
      <h3>Tonight&apos;s Audio</h3>
      <p style={{ color: "#4b5563" }}>
        {playsPerNight === 1
          ? "Plays a short preparation audio, then your goal recording for tonight. Your next audio is scheduled for tomorrow."
          : `Plays a short preparation audio, then your first goal recording. The second recording is scheduled ${gapHours} hours later and also begins with preparation audio when you play it.`}
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="button" onClick={startSession}>
          Start Session
        </button>
        {secondTrack && (
          <button className="button button-secondary" onClick={playSecond}>
            Play Second Recording
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
      {showActivePlaybackUi && current && (
        <div style={{ marginTop: 16 }}>
          <strong>Now Playing: {current.title}</strong>
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
          <audio
            ref={audioRef}
            controls={!!current}
            controlsList="nodownload"
            onEnded={handleEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            style={{ width: "100%", marginTop: 8, display: current ? "block" : "none" }}
          />
          {needsUserPlay && (
            <>
              <div className="card" style={{ marginTop: 12 }}>
                <p style={{ color: "#b91c1c", marginTop: 0 }}>
                  Tap below to start playback on iPhone.
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
                      iPhone requires a tap to begin playback.
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
                    Prep: {prepAudio.title}
                    {current?.url === prepAudio.url && " (now playing)"}
                  </div>
                )}
                {firstTrack && (
                  <div style={{ marginBottom: 2 }}>
                    First: {firstTrack.title}
                    {current?.url === firstTrack.url && " (now playing)"}
                  </div>
                )}
                {secondTrack && playsPerNight === 2 && (
                  <div>
                    Second: {secondTrack.title}
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
