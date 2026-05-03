"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const buttonStyle = { marginTop: 12 };

type ScreenWakeToggleProps = {
  title?: string;
  description?: string;
};

export default function ScreenWakeToggle({
  title = "Keep Screen Awake",
  description =
    "Enables when you start your session (tapping Start Session) so the screen can stay on through preparation and the first track — and through the long gap to the second recording. Phones often require this moment (user action) to grant wake lock. Use Disable for normal screen sleep when you do not need it."
}: ScreenWakeToggleProps) {
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const userWantsWakeLockRef = useRef(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sessionStartRetryIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && !("wakeLock" in navigator)) {
      setWakeLockSupported(false);
    }
  }, []);

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
      setFeedback(`Could not enable screen wake: ${msg}. Try again when this tab is in the foreground.`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const clearSessionStartRetries = () => {
      sessionStartRetryIdsRef.current.forEach((id) => clearTimeout(id));
      sessionStartRetryIdsRef.current = [];
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && userWantsWakeLockRef.current) {
        void requestWakeLock();
      }
    };
    /**
     * Fired when the member taps Start Session (or Plays the second half) — a user-gesture
     * path where `navigator.wakeLock.request()` is more likely to succeed on Android than
     * requesting on page load, and early enough to cover prep + first track before auto-lock.
     */
    const handleSessionStart = () => {
      userWantsWakeLockRef.current = true;
      clearSessionStartRetries();
      const tryRequest = () => {
        if (!userWantsWakeLockRef.current) return;
        if (document.visibilityState !== "visible") return;
        void requestWakeLock();
      };
      tryRequest();
      for (const ms of [250, 2000]) {
        const id = setTimeout(tryRequest, ms);
        sessionStartRetryIdsRef.current.push(id);
      }
    };
    const handleInterHalfGap = () => {
      if (userWantsWakeLockRef.current) {
        void requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("rfts-session-start", handleSessionStart);
    window.addEventListener("rfts-inter-half-gap", handleInterHalfGap);
    return () => {
      clearSessionStartRetries();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("rfts-session-start", handleSessionStart);
      window.removeEventListener("rfts-inter-half-gap", handleInterHalfGap);
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
        <p style={{ color: "#4b5563", marginTop: 12 }}>
          Your browser does not support screen wake lock. To keep your phone awake
          while listening, set your device&apos;s auto-lock to &quot;Never&quot; (e.g.
          Settings → Display → Sleep), or keep this app in the foreground.
        </p>
      )}
    </section>
  );
}
