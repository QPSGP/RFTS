"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

type SessionTrack = {
  title: string;
  url: string;
};

type SessionPlayerProps = {
  prepAudio?: SessionTrack | null;
  firstTrack?: SessionTrack | null;
  secondTrack?: SessionTrack | null;
  gapHours: number;
  autoStart?: boolean;
};

export type SessionPlayerHandle = {
  startSession: () => void;
};

const SessionPlayer = forwardRef<SessionPlayerHandle, SessionPlayerProps>(function SessionPlayer(
  { prepAudio, firstTrack, secondTrack, gapHours, autoStart = false },
  ref
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<SessionTrack[]>([]);
  const [current, setCurrent] = useState<SessionTrack | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [needsUserPlay, setNeedsUserPlay] = useState(false);

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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("rfts-session-start"));
    }
    const nextQueue = [prepAudio, firstTrack].filter(
      (track): track is SessionTrack => !!track
    );
    setQueue(nextQueue);
    setCurrent(nextQueue[0] || null);
    setMessage(null);
    setNeedsUserPlay(false);
    attemptPlay(nextQueue[0]);
  }, [firstTrack, prepAudio]);

  const playSecond = useCallback(() => {
    if (!secondTrack) {
      setMessage("No second recording scheduled tonight.");
      return;
    }
    setQueue([secondTrack]);
    setCurrent(secondTrack);
    setMessage(null);
    setNeedsUserPlay(false);
    attemptPlay(secondTrack);
  }, [secondTrack]);

  useImperativeHandle(ref, () => ({ startSession }), [startSession]);

  useEffect(() => {
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
      });
    }
  }, [current]);

  useEffect(() => {
    if (autoStart && firstTrack) {
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

  const handleEnded = () => {
    if (queue.length <= 1) {
      return;
    }
    const [, ...rest] = queue;
    setQueue(rest);
    setCurrent(rest[0] || null);
  };

  const handlePause = () => {
    audioRef.current?.pause();
  };

  const handlePlay = () => {
    const playPromise = audioRef.current?.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => setNeedsUserPlay(false))
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
      <h3>Tonight's session</h3>
      <p style={{ color: "#4b5563" }}>
        Plays a short preparation audio, then your first goal recording. The second
        recording is scheduled {gapHours} hours later.
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
      {current && (
        <div style={{ marginTop: 16 }}>
          <strong>Now Playing: {current.title}</strong>
          {!isMobile && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
              <button className="button button-secondary" onClick={handlePause} type="button">
                Pause
              </button>
              <button
                className="button button-secondary"
                onClick={handlePlay}
                type="button"
                disabled={isPlaying}
              >
                Play
              </button>
              <button className="button button-secondary" onClick={handleRestart} type="button">
                Restart
              </button>
            </div>
          )}
          {isMobile && <div style={{ height: 88 }} />}
          <audio
            ref={audioRef}
            controls={!!current}
            controlsList="nodownload"
            onEnded={handleEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            style={{ width: "100%", marginTop: 8, display: current ? "block" : "none" }}
            src={current?.url || undefined}
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
              </div>
              {isMobile && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handlePlay}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
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
                padding: "12px 16px",
                background: "#ffffff",
                boxShadow: "0 -6px 18px rgba(15, 23, 42, 0.12)",
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                justifyContent: "center",
                zIndex: 50
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
                  minWidth: 120
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
                  minWidth: 120
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
                  minWidth: 120
                }}
              >
                Restart
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
