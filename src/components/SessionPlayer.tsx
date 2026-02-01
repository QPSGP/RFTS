"use client";

import { useEffect, useRef, useState } from "react";

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

export default function SessionPlayer({
  prepAudio,
  firstTrack,
  secondTrack,
  gapHours,
  autoStart = false
}: SessionPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<SessionTrack[]>([]);
  const [current, setCurrent] = useState<SessionTrack | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const startSession = () => {
    if (!firstTrack) {
      setMessage("Select goals to build your session lineup.");
      return;
    }
    const nextQueue = [prepAudio, firstTrack].filter(
      (track): track is SessionTrack => !!track
    );
    setQueue(nextQueue);
    setCurrent(nextQueue[0] || null);
    setMessage(null);
  };

  const playSecond = () => {
    if (!secondTrack) {
      setMessage("No second recording scheduled tonight.");
      return;
    }
    setQueue([secondTrack]);
    setCurrent(secondTrack);
    setMessage(null);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) {
      return;
    }
    audio.load();
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

  const handleEnded = () => {
    if (queue.length <= 1) {
      return;
    }
    const [, ...rest] = queue;
    setQueue(rest);
    setCurrent(rest[0] || null);
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
          <audio
            ref={audioRef}
            controls
            onEnded={handleEnded}
            style={{ width: "100%", marginTop: 8 }}
          >
            <source src={current.url} />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
}
