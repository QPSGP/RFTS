"use client";

import { useEffect, useRef, useState } from "react";

type AudioPlayerProps = {
  title: string;
  description: string;
  audioUrl: string;
  coverUrl: string;
  /** When set, this "Starting Music" track plays first, then the main audio. */
  prepAudioUrl?: string;
};

export default function AudioPlayer({
  title,
  description,
  audioUrl,
  coverUrl,
  prepAudioUrl
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [isPlayingPrep, setIsPlayingPrep] = useState(!!prepAudioUrl);

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      // Ignore wake lock release errors
    } finally {
      setWakeLockActive(false);
    }
  };

  const requestWakeLock = async () => {
    if (!("wakeLock" in navigator)) {
      setWakeLockSupported(false);
      return;
    }
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      setWakeLockActive(true);
      wakeLockRef.current.addEventListener("release", () => {
        setWakeLockActive(false);
      });
    } catch {
      setWakeLockSupported(false);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handlePlay = () => {
      requestWakeLock();
    };

    const handlePause = () => {
      releaseWakeLock();
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handlePause);

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !audio.paused) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handlePause);
      document.removeEventListener("visibilitychange", handleVisibility);
      releaseWakeLock();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (prepAudioUrl) {
      audio.src = prepAudioUrl;
    }
  }, [prepAudioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !prepAudioUrl) return;

    const handleEnded = () => {
      if (isPlayingPrep) {
        setIsPlayingPrep(false);
        audio.src = audioUrl;
        audio.play().catch(() => {});
      }
    };

    const handleError = () => {
      if (isPlayingPrep) {
        setIsPlayingPrep(false);
        audio.src = audioUrl;
        audio.play().catch(() => {});
      }
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [prepAudioUrl, audioUrl, isPlayingPrep]);

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          alignItems: "flex-start"
        }}
      >
        <img
          src={coverUrl}
          alt={`${title} cover`}
          style={{
            width: "100%",
            maxWidth: 320,
            borderRadius: 12,
            border: "1px solid #e5e7eb"
          }}
        />
        <div style={{ width: "100%" }}>
          <h2 style={{ marginBottom: 8, marginTop: 0 }}>{title}</h2>
          <p style={{ color: "#4b5563", marginTop: 0, marginBottom: 8 }}>
            {prepAudioUrl && isPlayingPrep
              ? "Starting Music — your selected audio will play next."
              : description}
          </p>
          {wakeLockSupported ? (
            <p style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>
              {wakeLockActive
                ? "Screen sleep disabled while audio plays."
                : "Play audio to keep the screen awake."}
            </p>
          ) : (
            <p style={{ color: "#b45309", fontSize: 13, marginTop: 8 }}>
              Your browser does not support screen wake lock. Keep the app open
              while listening.
            </p>
          )}
        </div>
        <audio ref={audioRef} controls controlsList="nodownload" style={{ width: "100%" }}>
          {!prepAudioUrl && <source src={audioUrl} />}
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
}
