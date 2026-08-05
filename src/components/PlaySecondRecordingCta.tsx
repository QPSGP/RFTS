"use client";

import { useEffect, useState } from "react";

/**
 * Shown on library pages for active members on 2-per-night when tonight has a second track.
 * Same action as “Play Second Audio” on Play Options (intro relaxation music, then second goal).
 */
export default function PlaySecondRecordingCta() {
  const [visible, setVisible] = useState(false);
  const [secondTitle, setSecondTitle] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/user/me", { credentials: "include" });
        if (!meRes.ok) return;
        const me = await meRes.json();
        if (me.profile?.subscriptionStatus !== "active") return;
        if ((me.profile?.playsPerNight ?? 2) !== 2) return;
        const schedRes = await fetch("/api/user/schedule?nights=21", {
          credentials: "include",
          cache: "no-store"
        });
        if (!schedRes.ok) return;
        const data = await schedRes.json();
        const currentNight = typeof data?.currentNight === "number" ? data.currentNight : 1;
        const schedule = data?.schedule || [];
        const idx = Math.max(0, Math.min(currentNight - 1, schedule.length - 1));
        const tonight = schedule[idx];
        const second = tonight?.tracks?.[1];
        if (!second?.title) return;
        if (!cancelled) {
          setSecondTitle(second.title);
          setVisible(true);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible || !secondTitle) return null;

  return (
    <div
      className="card"
      style={{
        marginBottom: 20,
        background: "#f8fafc",
        borderColor: "#e2e8f0"
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>Play Options - second audio tonight</h3>
      <p style={{ color: "#475569", marginTop: 0, marginBottom: 8 }}>
        This opens your <strong>nightly session</strong> on Play Options (not the library player above).{" "}
        <strong>{secondTitle}</strong> - same intro relaxation music as your session, then this goal audio.
      </p>
      <a
        className="button button-secondary"
        href="/play-options?playSecond=1#meditation-session"
        style={{ marginTop: 4 }}
      >
        Play second audio
      </a>
    </div>
  );
}
