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
    "On by default so overnight sessions keep running — especially the second recording after the gap on phones that pause timers when the screen locks. Use Disable if you prefer your normal screen sleep."
}: ScreenWakeToggleProps) {
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const userWantsWakeLockRef = useRef(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasAutoEnabledRef = useRef(false);

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

  /** Default on: narrow-mobile-only auto-enable missed Android landscape and many tablets; timers + second-half playback need the tab to stay awake. */
  useEffect(() => {
    if (hasAutoEnabledRef.current) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    hasAutoEnabledRef.current = true;
    userWantsWakeLockRef.current = true;

    const tryEnable = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
      }
    };

    tryEnable();
    const t1 = setTimeout(tryEnable, 250);
    const t2 = setTimeout(tryEnable, 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
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
    const handleInterHalfGap = () => {
      if (userWantsWakeLockRef.current) {
        void requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("rfts-session-start", handleSessionStart);
    window.addEventListener("rfts-inter-half-gap", handleInterHalfGap);
    return () => {
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
