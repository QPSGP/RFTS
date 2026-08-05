"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAccountScreenWakePreference,
  readScreenWakePreference,
  saveAccountScreenWakePreference,
  writeScreenWakePreference
} from "@/lib/screen-wake-preference";

const buttonStyle = { marginTop: 12 };

function isAppleMobileUa(): boolean {
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

/** Auto screen wake for the full guided session (prep, main audios, and inter-half wait). */
function shouldAutoEnableWakeOnSessionStart(): boolean {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return false;
  return isAppleMobileUa() || isAndroidUa();
}

type ScreenWakeToggleProps = {
  title?: string;
  description?: string;
};

export default function ScreenWakeToggle({
  title = "Keep Screen Awake",
  description =
    "When you start a session, we try to turn on screen wake automatically in Chrome, Safari, and Edge on phones and tablets. If it does not turn on, tap Enable Screen Wake while this page is visible. Your choice is saved to your account and remembered on this device. Screen wake helps the app stay active but may not stop sleep while your phone is locked-unlock and tap Play if the second recording is late. Firefox and some browsers may not support screen wake."
}: ScreenWakeToggleProps) {
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  /** Saved preference (localStorage), independent of whether the OS wake lock is held right now. */
  const [prefEnabled, setPrefEnabled] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const userWantsWakeLockRef = useRef(false);
  /** Android: auto wake for the full guided session (not only the inter-half gap). */
  const androidSessionWakeActiveRef = useRef(false);
  /** Legacy flag: gap nudge polling when inter-half wait runs (Android session wake already covers this). */
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
          writeScreenWakePreference(true);
          setPrefEnabled(true);
          setFeedback("Screen wake enabled. Your screen will stay on during playback.");
        }
        return;
      }
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (opts.setUserIntent) {
          userWantsWakeLockRef.current = true;
          writeScreenWakePreference(true);
          setPrefEnabled(true);
        }
        wakeLockRef.current = sentinel;
        setWakeLockActive(true);
        sentinel.addEventListener("release", () => {
          wakeLockRef.current = null;
          setWakeLockActive(false);
          const wantWake =
            userWantsWakeLockRef.current ||
            androidSessionWakeActiveRef.current ||
            gapAutoWakeActiveRef.current;
          if (wantWake && document.visibilityState === "visible" && acquireScreenWakeLockRef.current) {
            void acquireScreenWakeLockRef.current({
              setUserIntent: userWantsWakeLockRef.current,
              feedbackOnError: false
            });
          }
        });
        if (opts.setUserIntent) {
          writeScreenWakePreference(true);
          setPrefEnabled(true);
          setFeedback("Screen wake enabled. Your screen will stay on during playback.");
        } else if (
          androidSessionWakeActiveRef.current ||
          gapAutoWakeActiveRef.current ||
          userWantsWakeLockRef.current
        ) {
          setFeedback("Screen wake is on for this session.");
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

  const applySavedPreference = useCallback(
    (enabled: boolean, opts?: { tryAcquire?: boolean }) => {
      userWantsWakeLockRef.current = enabled;
      setPrefEnabled(enabled);
      writeScreenWakePreference(enabled);
      if (enabled && opts?.tryAcquire !== false && document.visibilityState === "visible") {
        void acquireScreenWakeLock({ setUserIntent: true, feedbackOnError: false });
      }
    },
    [acquireScreenWakeLock]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const accountPref = await fetchAccountScreenWakePreference();
      if (cancelled) return;
      const localPref = readScreenWakePreference();
      const enabled = accountPref ?? localPref;
      if (accountPref !== null && accountPref !== localPref) {
        writeScreenWakePreference(accountPref);
      } else if (accountPref === null && localPref) {
        void saveAccountScreenWakePreference(true);
      }
      if (enabled) {
        applySavedPreference(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySavedPreference]);

  const releaseGapAutoWakeOnly = useCallback(async () => {
    if (gapWakePollIntervalRef.current !== null) {
      clearInterval(gapWakePollIntervalRef.current);
      gapWakePollIntervalRef.current = null;
    }
    gapAutoWakeActiveRef.current = false;
    if (userWantsWakeLockRef.current || androidSessionWakeActiveRef.current) {
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
    androidSessionWakeActiveRef.current = false;
    if (!opts?.afterSession) {
      userWantsWakeLockRef.current = false;
      writeScreenWakePreference(false);
      setPrefEnabled(false);
      void saveAccountScreenWakePreference(false);
    } else {
      const saved = readScreenWakePreference();
      userWantsWakeLockRef.current = saved;
      setPrefEnabled(saved);
    }
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
    setPrefEnabled(true);
    writeScreenWakePreference(true);
    void saveAccountScreenWakePreference(true);
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
    const wantsWakeLockHeld = () =>
      userWantsWakeLockRef.current ||
      androidSessionWakeActiveRef.current ||
      gapAutoWakeActiveRef.current;

    const beginWakeLockPolling = () => {
      clearGapWakePoll();
      if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
      if (!wantsWakeLockHeld()) return;
      gapWakePollIntervalRef.current = window.setInterval(() => {
        if (!wantsWakeLockHeld()) {
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
      if (document.visibilityState === "visible" && wantsWakeLockHeld()) {
        void acquireScreenWakeLock({
          setUserIntent: userWantsWakeLockRef.current,
          feedbackOnError: userWantsWakeLockRef.current
        });
      }
    };
    const handleSessionStart = () => {
      const savedPref = readScreenWakePreference();
      if (savedPref) {
        userWantsWakeLockRef.current = true;
        setPrefEnabled(true);
      }
      if (!shouldAutoEnableWakeOnSessionStart() && !savedPref) return;
      if (isAndroidUa()) {
        androidSessionWakeActiveRef.current = true;
      } else if (shouldAutoEnableWakeOnSessionStart()) {
        userWantsWakeLockRef.current = true;
      }
      clearSessionStartRetries();
      const tryRequest = () => {
        if (!wantsWakeLockHeld()) return;
        if (document.visibilityState !== "visible") return;
        void acquireScreenWakeLock({
          setUserIntent: userWantsWakeLockRef.current,
          feedbackOnError: false
        });
      };
      tryRequest();
      for (const ms of [250, 2000, 5000, 15000]) {
        const id = setTimeout(tryRequest, ms);
        sessionStartRetryIdsRef.current.push(id);
      }
      const failId = setTimeout(() => {
        if (wantsWakeLockHeld() && !wakeLockRef.current) {
          setFeedback(
            "Screen wake could not start automatically. Keep this tab visible and tap Enable Screen Wake."
          );
        }
      }, 16_000);
      sessionStartRetryIdsRef.current.push(failId);
      if (isAndroidUa() && "wakeLock" in navigator) {
        beginWakeLockPolling();
      }
    };
    const handleGapWakeNudge = () => {
      if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
      if (!wantsWakeLockHeld()) return;
      if (document.visibilityState !== "visible") return;
      void acquireScreenWakeLock({
        setUserIntent: userWantsWakeLockRef.current,
        feedbackOnError: false
      });
    };
    const handlePageShow = () => {
      if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
      if (!wantsWakeLockHeld()) return;
      void acquireScreenWakeLock({
        setUserIntent: userWantsWakeLockRef.current,
        feedbackOnError: false
      });
    };
    const handleInterHalfGap = () => {
      if (isAndroidUa() && "wakeLock" in navigator) {
        gapAutoWakeActiveRef.current = true;
        handleGapWakeNudge();
        for (const ms of [250, 2000, 5000, 15000]) {
          const id = setTimeout(() => handleGapWakeNudge(), ms);
          sessionStartRetryIdsRef.current.push(id);
        }
      } else {
        gapAutoWakeActiveRef.current = false;
      }
      if (userWantsWakeLockRef.current) {
        void acquireScreenWakeLock({ setUserIntent: true, feedbackOnError: false });
      }
      if ("wakeLock" in navigator && wantsWakeLockHeld()) {
        beginWakeLockPolling();
      }
    };
    const handleSecondHalfStarted = () => {
      void releaseGapAutoWakeOnly();
    };
    const handleSessionEnd = () => {
      clearSessionStartRetries();
      androidSessionWakeActiveRef.current = false;
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
      void releaseWakeLock({ afterSession: true });
    };
  }, [acquireScreenWakeLock, releaseWakeLock, releaseGapAutoWakeOnly]);

  const wakeEnabled = prefEnabled || wakeLockActive;

  return (
    <section className="card" style={{ marginBottom: 24 }}>
      <h3>{title}</h3>
      <p style={{ color: "#4b5563" }}>{description}</p>
      {wakeLockSupported ? (
        <>
          <button
            className="button"
            style={buttonStyle}
            onClick={() => (wakeEnabled ? releaseWakeLock() : requestWakeLock())}
            disabled={isLoading}
          >
            {isLoading
              ? "Enabling..."
              : wakeEnabled
                ? "Disable Screen Wake"
                : "Enable Screen Wake"}
          </button>
          {feedback && (
            <p
              style={{
                marginTop: 12,
                color: wakeEnabled ? "#059669" : feedback.includes("Could not") ? "#b45309" : "#4b5563",
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
