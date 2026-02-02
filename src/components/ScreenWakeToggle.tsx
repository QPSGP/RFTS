"use client";

import { useEffect, useState } from "react";

const buttonStyle = { marginTop: 12 };

type ScreenWakeToggleProps = {
  title?: string;
  description?: string;
};

export default function ScreenWakeToggle({
  title = "Keep Screen Awake",
  description = "Use this if you are listening overnight on a phone and want to prevent the screen from sleeping while playback is active."
}: ScreenWakeToggleProps) {
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockRef, setWakeLockRef] = useState<WakeLockSentinel | null>(null);

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef) {
        await wakeLockRef.release();
      }
    } catch {
      // ignore
    } finally {
      setWakeLockRef(null);
      setWakeLockActive(false);
    }
  };

  const requestWakeLock = async () => {
    if (!("wakeLock" in navigator)) {
      setWakeLockSupported(false);
      return;
    }
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      setWakeLockRef(sentinel);
      setWakeLockActive(true);
      sentinel.addEventListener("release", () => {
        setWakeLockActive(false);
      });
    } catch {
      setWakeLockSupported(false);
    }
  };

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && wakeLockActive) {
        requestWakeLock();
      }
    };
    const handleSessionStart = () => {
      if (!wakeLockActive) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("rfts-session-start", handleSessionStart);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("rfts-session-start", handleSessionStart);
      releaseWakeLock();
    };
  }, [wakeLockActive, wakeLockRef]);

  return (
    <section className="card" style={{ marginBottom: 24 }}>
      <h3>{title}</h3>
      <p style={{ color: "#4b5563" }}>{description}</p>
      {wakeLockSupported ? (
        <button
          className="button"
          style={buttonStyle}
          onClick={() => (wakeLockActive ? releaseWakeLock() : requestWakeLock())}
        >
          {wakeLockActive ? "Disable Screen Wake" : "Enable Screen Wake"}
        </button>
      ) : (
        <p style={{ color: "#b45309", marginTop: 12 }}>
          Your browser does not support screen wake lock. Keep the app open while
          listening.
        </p>
      )}
    </section>
  );
}
