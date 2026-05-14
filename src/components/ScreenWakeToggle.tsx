"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const buttonStyle = { marginTop: 12 };

/** Screen wake on session start helps iPhone Safari through prep + long gap. */
function shouldAutoEnableWakeOnSessionStart(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const iPadDesktopUa = platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPod|iPad/i.test(ua) || iPadDesktopUa;
}

function isAndroidUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

type ScreenWakeToggleProps = {
  title?: string;
  description?: string;
};

export default function ScreenWakeToggle({
  title = "Keep Screen Awake",
  description =
    "On iPhone and iPad, screen wake turns on when you start your session and off when the session ends. On Android, screen wake also turns on automatically during the wait between your first and second audio (when your browser supports it), then turns off when the second half starts. While that wait runs, the app periodically retries the wake request if the browser drops it. You can still tap Enable anytime to keep the screen on for the whole session, or Disable to turn it off."
}: ScreenWakeToggleProps) {
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const userWantsWakeLockRef = useRef(false);
  /** Android-only: auto wake lock for the long inter-half gap (legacy Sirius-style); released when second half starts unless the user chose full-session wake. */
  const gapAutoWakeActiveRef = useRef(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sessionStartRetryIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Browser `setInterval` id (number); avoid `NodeJS.Timeout` mismatch in client build. */
  const gapWakePollIntervalRef = useRef<number | null>(null);
  const acquireScreenWakeLockRef = useRef<
    ((opts: { setUserIntent: boolean; feedbackOnError: boolean }) => Promise<void>) | null
  >(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && !("wakeLock" in navigator)) {
      setWakeLockSupported(false);
    }
  }, []);

  const acquireScreenWakeLock = useCallback(
    async (opts: { setUserIntent: boolean; feedbackOnError: boolean }) => {
      if (!("wakeLock" in navigator)) {
        if (opts.setUserIntent) {
          setWakeLockSupported(false);
          setFeedback("Your browser does not support screen wake lock.");
        }
        return;
      }
      if (document.visibilityState !== "visible") {
        if (opts.feedbackOnError && opts.setUserIntent) {
          setFeedback("Please make sure this tab is visible, then try again.");
        }
        return;
      }
      if (wakeLockRef.current) {
        if (opts.setUserIntent) {
          userWantsWakeLockRef.current = true;
          setFeedback("Screen wake enabled. Your screen will stay on during playback.");
        }
        return;
      }
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (opts.setUserIntent) {
          userWantsWakeLockRef.current = true;
        }
        wakeLockRef.current = sentinel;
        setWakeLockActive(true);
        sentinel.addEventListener("release", () => {
          wakeLockRef.current = null;
          setWakeLockActive(false);
          const wantWake =
            userWantsWakeLockRef.current ||
            (gapAutoWakeActiveRef.current && isAndroidUa() && "wakeLock" in navigator);
          if (wantWake && document.visibilityState === "visible" && acquireScreenWakeLockRef.current) {
            void acquireScreenWakeLockRef.current({
              setUserIntent: userWantsWakeLockRef.current,
              feedbackOnError: false
            });
          }
        });
        if (opts.setUserIntent) {
          setFeedback("Screen wake enabled. Your screen will stay on during playback.");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Request failed";
        if (opts.feedbackOnError && opts.setUserIntent) {
          setFeedback(`Could not enable screen wake: ${msg}. Try again when this tab is in the foreground.`);
        }
      }
    },
    []
  );
  acquireScreenWakeLockRef.current = acquireScreenWakeLock;

  const releaseGapAutoWakeOnly = useCallback(async () => {
    if (gapWakePollIntervalRef.current !== null) {
      clearInterval(gapWakePollIntervalRef.current);
      gapWakePollIntervalRef.current = null;
    }
    gapAutoWakeActiveRef.current = false;
    if (userWantsWakeLockRef.current) {
      return;
    }
    sessionStartRetryIdsRef.current.forEach((id) => clearTimeout(id));
    sessionStartRetryIdsRef.current = [];
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
      }
    } catch {
      // ignore
    } finally {
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  const releaseWakeLock = useCallback(async (opts?: { afterSession?: boolean }) => {
    if (gapWakePollIntervalRef.current !== null) {
      clearInterval(gapWakePollIntervalRef.current);
      gapWakePollIntervalRef.current = null;
    }
    sessionStartRetryIdsRef.current.forEach((id) => clearTimeout(id));
    sessionStartRetryIdsRef.current = [];
    gapAutoWakeActiveRef.current = false;
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
    userWantsWakeLockRef.current = true;
    try {
      await acquireScreenWakeLock({ setUserIntent: true, feedbackOnError: true });
    } finally {
      setIsLoading(false);
    }
  }, [acquireScreenWakeLock]);

  useEffect(() => {
    const GAP_WAKE_POLL_MS = 60_000;
    const clearGapWakePoll = () => {
      if (gapWakePollIntervalRef.current !== null) {
        clearInterval(gapWakePollIntervalRef.current);
        gapWakePollIntervalRef.current = null;
      }
    };
    const clearSessionStartRetries = () => {
      sessionStartRetryIdsRef.current.forEach((id) => clearTimeout(id));
      sessionStartRetryIdsRef.current = [];
    };
    const beginGapWakePolling = () => {
      clearGapWakePoll();
      if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
      if (!gapAutoWakeActiveRef.current && !userWantsWakeLockRef.current) return;
      gapWakePollIntervalRef.current = window.setInterval(() => {
        const wantWake = userWantsWakeLockRef.current || gapAutoWakeActiveRef.current;
        if (!wantWake) {
          clearGapWakePoll();
          return;
        }
        if (document.visibilityState === "visible") {
          void acquireScreenWakeLock({
            setUserIntent: userWantsWakeLockRef.current,
            feedbackOnError: false
          });
        }
      }, GAP_WAKE_POLL_MS);
    };
    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        (userWantsWakeLockRef.current || gapAutoWakeActiveRef.current)
      ) {
        void acquireScreenWakeLock({
          setUserIntent: userWantsWakeLockRef.current,
          feedbackOnError: userWantsWakeLockRef.current
        });
      }
    };
    const handleSessionStart = () => {
      if (!shouldAutoEnableWakeOnSessionStart()) return;
      userWantsWakeLockRef.current = true;
      clearSessionStartRetries();
      const tryRequest = () => {
        if (!userWantsWakeLockRef.current) return;
        if (document.visibilityState !== "visible") return;
        void acquireScreenWakeLock({ setUserIntent: true, feedbackOnError: false });
      };
      tryRequest();
      for (const ms of [250, 2000]) {
        const id = setTimeout(tryRequest, ms);
        sessionStartRetryIdsRef.current.push(id);
      }
    };
    const handleGapWakeNudge = () => {
      if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
      if (!gapAutoWakeActiveRef.current && !userWantsWakeLockRef.current) return;
      if (document.visibilityState !== "visible") return;
      void acquireScreenWakeLock({
        setUserIntent: userWantsWakeLockRef.current,
        feedbackOnError: false
      });
    };
    const handlePageShow = () => {
      if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
      if (!gapAutoWakeActiveRef.current && !userWantsWakeLockRef.current) return;
      void acquireScreenWakeLock({
        setUserIntent: userWantsWakeLockRef.current,
        feedbackOnError: false
      });
    };
    const handleInterHalfGap = () => {
      clearGapWakePoll();
      if (isAndroidUa() && "wakeLock" in navigator) {
        gapAutoWakeActiveRef.current = true;
        clearSessionStartRetries();
        const tryGapWake = () => {
          if (!gapAutoWakeActiveRef.current) return;
          if (document.visibilityState !== "visible") return;
          void acquireScreenWakeLock({
            setUserIntent: userWantsWakeLockRef.current,
            feedbackOnError: false
          });
        };
        tryGapWake();
        for (const ms of [250, 2000, 5000, 15000]) {
          const id = setTimeout(tryGapWake, ms);
          sessionStartRetryIdsRef.current.push(id);
        }
      } else {
        gapAutoWakeActiveRef.current = false;
      }
      if (userWantsWakeLockRef.current) {
        void acquireScreenWakeLock({ setUserIntent: true, feedbackOnError: false });
      }
      if ("wakeLock" in navigator && (gapAutoWakeActiveRef.current || userWantsWakeLockRef.current)) {
        beginGapWakePolling();
      }
    };
    const handleSecondHalfStarted = () => {
      void releaseGapAutoWakeOnly();
    };
    const handleSessionEnd = () => {
      clearSessionStartRetries();
      void releaseWakeLock({ afterSession: true });
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("rfts-session-start", handleSessionStart);
    window.addEventListener("rfts-inter-half-gap", handleInterHalfGap);
    window.addEventListener("rfts-gap-wake-nudge", handleGapWakeNudge);
    window.addEventListener("rfts-second-half-started", handleSecondHalfStarted);
    window.addEventListener("rfts-session-end", handleSessionEnd);
    return () => {
      clearSessionStartRetries();
      clearGapWakePoll();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("rfts-session-start", handleSessionStart);
      window.removeEventListener("rfts-inter-half-gap", handleInterHalfGap);
      window.removeEventListener("rfts-gap-wake-nudge", handleGapWakeNudge);
      window.removeEventListener("rfts-second-half-started", handleSecondHalfStarted);
      window.removeEventListener("rfts-session-end", handleSessionEnd);
      void releaseWakeLock();
    };
  }, [acquireScreenWakeLock, releaseWakeLock, releaseGapAutoWakeOnly]);

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
