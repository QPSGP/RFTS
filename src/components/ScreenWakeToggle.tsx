"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const buttonStyle = { marginTop: 12 };

/** Screen wake on session start helps iPhone Safari through prep + long gap; Android keeps the screen on unnecessarily and our gap timing fixes target locked-screen behavior — wake stays opt-in there. */
function shouldAutoEnableWakeOnSessionStart(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const iPadDesktopUa = platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPod|iPad/i.test(ua) || iPadDesktopUa;
}

type ScreenWakeToggleProps = {
  title?: string;
  description?: string;
};

export default function ScreenWakeToggle({
  title = "Keep Screen Awake",
  description =
    "On iPhone and iPad, screen wake turns on when you start your session and off when the session ends. On Android it stays off unless you tap Enable — use that if the second recording did not start until you unlocked the phone. Anyone can use Disable anytime."
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

  const releaseWakeLock = useCallback(async (opts?: { afterSession?: boolean }) => {
    sessionStartRetryIdsRef.current.forEach((id) => clearTimeout(id));
    sessionStartRetryIdsRef.current = [];
    userWantsWakeLockRef.current = false;
    const hadLock = wakeLockRef.current !== null;
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
      }
    } catch {
      // ignore
    } finally {
      wakeLockRef.current = null;
      setWakeLockActive(false);
      if (opts?.afterSession) {
        setFeedback(hadLock ? "Screen wake released after your session ended." : null);
      } else {
        setFeedback("Screen wake disabled.");
      }
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
     * iOS: enable wake at Start Session / second-half gesture (battery tradeoff worth it).
     * Android: opt-in via button only — gap resume uses audio `timeupdate` + visibility without keeping the LCD on.
     */
    const handleSessionStart = () => {
      if (!shouldAutoEnableWakeOnSessionStart()) return;
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
    const handleSessionEnd = () => {
      clearSessionStartRetries();
      void releaseWakeLock({ afterSession: true });
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("rfts-session-start", handleSessionStart);
    window.addEventListener("rfts-inter-half-gap", handleInterHalfGap);
    window.addEventListener("rfts-session-end", handleSessionEnd);
    return () => {
      clearSessionStartRetries();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("rfts-session-start", handleSessionStart);
      window.removeEventListener("rfts-inter-half-gap", handleInterHalfGap);
      window.removeEventListener("rfts-session-end", handleSessionEnd);
      void releaseWakeLock();
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
