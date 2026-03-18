"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const buttonStyle = { marginTop: 12 };
const MOBILE_MAX_WIDTH = 768;

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= MOBILE_MAX_WIDTH;
}

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
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const userWantsWakeLockRef = useRef(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasAutoEnabledRef = useRef(false);

  const releaseWakeLock = useCallback(async () => {
    userWantsWakeLockRef.current = false;
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
      }
    } catch {
      // ignore
    } finally {
      wakeLockRef.current = null;
      setWakeLockActive(false);
      setFeedback("Screen wake disabled.");
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) {
      setWakeLockSupported(false);
      setFeedback("Your browser does not support screen wake lock.");
      return;
    }
    if (document.visibilityState !== "visible") {
      setFeedback("Please make sure this tab is visible, then try again.");
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      userWantsWakeLockRef.current = true;
      setWakeLockActive(true);
      setFeedback("Screen wake enabled. Your screen will stay on during playback.");
      sentinel.addEventListener("release", () => {
        wakeLockRef.current = null;
        setWakeLockActive(false);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setWakeLockSupported(false);
      setFeedback(`Could not enable screen wake: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasAutoEnabledRef.current) return;
    if (!isMobileViewport() || !("wakeLock" in navigator)) return;
    hasAutoEnabledRef.current = true;
    userWantsWakeLockRef.current = true;
    const t = setTimeout(() => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    }, 100);
    return () => clearTimeout(t);
  }, [requestWakeLock]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && userWantsWakeLockRef.current) {
        requestWakeLock();
      }
    };
    const handleSessionStart = () => {
      if (!wakeLockRef.current) {
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
  }, [requestWakeLock, releaseWakeLock]);

  return (
    <section className="card" style={{ marginBottom: 24 }}>
      <h3>{title}</h3>
      <p style={{ color: "#4b5563" }}>{description}</p>
      {wakeLockSupported ? (
        <>
          <button
            className="button"
            style={buttonStyle}
            onClick={() => (wakeLockActive ? releaseWakeLock() : requestWakeLock())}
            disabled={isLoading}
          >
            {isLoading
              ? "Enabling..."
              : wakeLockActive
                ? "Disable Screen Wake"
                : "Enable Screen Wake"}
          </button>
          {feedback && (
            <p
              style={{
                marginTop: 12,
                color: wakeLockActive ? "#059669" : feedback.includes("Could not") ? "#b45309" : "#4b5563",
                fontSize: 14
              }}
            >
              {feedback}
            </p>
          )}
        </>
      ) : (
        <p style={{ color: "#b45309", marginTop: 12 }}>
          Your browser does not support screen wake lock. Keep the app open while
          listening.
        </p>
      )}
    </section>
  );
}
