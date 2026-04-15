"use client";

import { useEffect, useRef, useState } from "react";
import { logMemberPlayedAudio } from "@/lib/member-audio-activity";

type AudioPlayerProps = {
  title: string;
  description: string;
  audioUrl: string;
  coverUrl: string;
  /** When set, this "Starting Music" track plays first, then the main audio. */
  prepAudioUrl?: string;
  /** When false, the cover image is not shown (e.g. library detail page). */
  showCover?: boolean;
};

export default function AudioPlayer({
  title,
  description,
  audioUrl,
  coverUrl,
  prepAudioUrl,
  showCover = true
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  /** After "Close library audio", src is cleared; next Play must reassign prep/main URLs. */
  const libraryStoppedRef = useRef(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [isPlayingPrep, setIsPlayingPrep] = useState(!!prepAudioUrl);
  const [isMobile, setIsMobile] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  /** Mobile fixed Pause/Play/Restart strip; hidden after Close until playback starts again. */
  const [showMobileLibraryBar, setShowMobileLibraryBar] = useState(true);

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
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia("(max-width: 768px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    if (media.addEventListener) {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handlePlay = () => {
      requestWakeLock();
      setIsPlaying(true);
      setShowMobileLibraryBar(true);
    };

    const handlePause = () => {
      releaseWakeLock();
      setIsPlaying(false);
    };

    const handlePlaying = () => {
      const src = audio.currentSrc || audio.src || "";
      const onPrep = !!prepAudioUrl && src.includes("prep=1");
      const label = onPrep ? "Starting music" : title;
      logMemberPlayedAudio(`Library — ${label}`);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("playing", handlePlaying);
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
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handlePause);
      document.removeEventListener("visibilitychange", handleVisibility);
      releaseWakeLock();
    };
  }, [prepAudioUrl, title]);

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

  const handleLibraryPause = () => {
    audioRef.current?.pause();
  };

  const handleCloseLibraryAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute("src");
    audio.load();
    void releaseWakeLock();
    setIsPlaying(false);
    setIsPlayingPrep(!!prepAudioUrl);
    libraryStoppedRef.current = true;
    setShowMobileLibraryBar(false);
  };

  const handleLibraryPlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (libraryStoppedRef.current || !(audio.currentSrc || audio.src)) {
      libraryStoppedRef.current = false;
      if (prepAudioUrl) {
        setIsPlayingPrep(true);
        audio.src = prepAudioUrl;
      } else {
        setIsPlayingPrep(false);
        audio.src = audioUrl;
      }
    }
    void audio.play().catch(() => {});
  };

  const handleLibraryRestart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    libraryStoppedRef.current = false;
    if (prepAudioUrl) {
      setIsPlayingPrep(true);
      audio.src = prepAudioUrl;
    } else {
      setIsPlayingPrep(false);
      audio.src = audioUrl;
    }
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  };

  const nowPlayingLabel =
    prepAudioUrl && isPlayingPrep ? "Starting music" : title;

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
        {showCover && (
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
        )}
        <div style={{ width: "100%" }}>
          <h2 style={{ marginBottom: 8, marginTop: 0 }}>{title}</h2>
          <p style={{ color: "#4b5563", marginTop: 0, marginBottom: 8 }}>
            {description}
          </p>
          {prepAudioUrl && isPlayingPrep && (
            <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              Starting Music — your selected audio will play next.
            </p>
          )}
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
        {isMobile && showMobileLibraryBar && (
          <div style={{ height: 220 }} aria-hidden />
        )}
        <audio ref={audioRef} controls controlsList="nodownload" style={{ width: "100%" }}>
          {!prepAudioUrl && <source src={audioUrl} />}
          Your browser does not support the audio element.
        </audio>
        <button
          type="button"
          className="button button-secondary"
          onClick={handleCloseLibraryAudio}
          style={{ marginTop: 10 }}
        >
          Close library audio
        </button>
      </div>
      {isMobile && showMobileLibraryBar && (
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
              Library
            </strong>
            <div style={{ marginBottom: 2 }}>
              Now playing: <span style={{ color: "#111827" }}>{nowPlayingLabel}</span>
            </div>
            {prepAudioUrl && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                {isPlayingPrep
                  ? "Then your selected audio will play."
                  : "Main recording."}
              </div>
            )}
            <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0 0" }}>
              {`"Play second recording" on this page is for your nightly session on Play Options, not this library player.`}
            </p>
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleCloseLibraryAudio}
            style={{
              width: "100%",
              marginBottom: 12,
              padding: "14px 16px",
              fontSize: 16,
              fontWeight: 600,
              borderColor: "#475569",
              color: "#1e293b"
            }}
          >
            Close library audio
          </button>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center"
            }}
          >
            <button
              type="button"
              className="button button-secondary"
              onClick={handleLibraryPause}
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
              type="button"
              className="button button-secondary"
              onClick={handleLibraryPlay}
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
              type="button"
              className="button button-secondary"
              onClick={handleLibraryRestart}
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
        </div>
      )}
    </div>
  );
}
