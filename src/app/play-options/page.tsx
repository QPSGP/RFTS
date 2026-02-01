"use client";

import { useEffect, useState } from "react";
import ScreenWakeToggle from "@/components/ScreenWakeToggle";

export default function PlayOptionsPage() {
  const [status, setStatus] = useState<"loading" | "loggedOut" | "inactive" | "active">(
    "loading"
  );
  const [profile, setProfile] = useState<{
    email: string;
    goalIds: string[];
    subscriptionStatus: string | null;
    subscriptionTier: string | null;
  } | null>(null);
  const [schedule, setSchedule] = useState<
    { night: number; tracks: { id: string; title: string }[]; note?: string }[]
  >([]);

  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        const nextProfile = data.profile;
        setProfile(nextProfile || null);
        const subscriptionStatus = nextProfile?.subscriptionStatus;
        setStatus(subscriptionStatus === "active" ? "active" : "inactive");
        if (subscriptionStatus === "active") {
          fetch("/api/user/schedule?nights=7")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setSchedule(data?.schedule || []))
            .catch(() => setSchedule([]));
        }
      })
      .catch(() => setStatus("loggedOut"));
  }, []);

  if (status === "loading") {
    return null;
  }

  if (status === "loggedOut") {
    return (
      <main>
        <section className="hero section">
          <span className="pill">Member Access</span>
          <h1>Play Options</h1>
          <p>
            Log in to access your nightly sessions and personal audio library.
          </p>
          <div className="cta-row" style={{ marginTop: 16 }}>
            <a className="button" href="/member/login">
              Member Login
            </a>
            <a className="button button-secondary" href="/signup/step-1-subscription-selection">
              Choose Subscription
            </a>
          </div>
        </section>
      </main>
    );
  }

  if (status === "inactive") {
    return (
      <main>
        <section className="hero section">
          <span className="pill">Subscription Required</span>
          <h1>Activate your membership</h1>
          <p>
            Your account is ready, but a subscription is required to start sessions.
          </p>
          <div className="cta-row" style={{ marginTop: 16 }}>
            <a className="button" href="/signup/step-1-subscription-selection">
              Choose Subscription
            </a>
            <a className="button button-secondary" href="/member/login">
              Switch Account
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="hero section">
        <span className="pill">Nightly Sessions</span>
        <h1>Play Options</h1>
        <p>
          Tap to start your session and keep exploring your personalized tools below.
        </p>
        <div className="cta-row" style={{ marginTop: 16 }}>
          <a
            className="button"
            href="/play-options#meditation-session"
            style={{ padding: "14px 22px", fontSize: 16 }}
          >
            Start Session
          </a>
          <a className="button button-secondary" href="/library">
            Open Library
          </a>
        </div>
      </section>
      {profile && profile.goalIds?.length === 0 && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h3>Pick your goals</h3>
          <p>
            Choose up to 10 goals to personalize your nightly session lineup.
          </p>
          <a className="button" href="/goals">
            Set Goals
          </a>
        </section>
      )}
      <ScreenWakeToggle />
      <section className="grid">
        <div className="card" id="meditation-library">
          <h3>Meditation Library</h3>
          <p>
            Browse the full audio library and play any track on demand. This
            section mirrors the existing anchor.
          </p>
        </div>
        <div className="card" id="meditation-session">
          <h3>Meditation Session</h3>
          <p>
            Start a guided session tailored to your goals. This section mirrors
            the existing anchor.
          </p>
          {schedule.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong>Tonight's lineup</strong>
              <div className="stack" style={{ marginTop: 8 }}>
                {schedule[0].tracks.map((track) => (
                  <a key={track.id} className="button button-secondary" href={`/library/${track.id}`}>
                    Play {track.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        {schedule.length > 0 && (
          <div className="card">
            <h3>Session Cycle</h3>
            <p>
              Your sessions rotate through the goals you selected. Each night lists the
              two recordings scheduled to play.
            </p>
            <div className="grid" style={{ marginTop: 12 }}>
              {schedule.map((night) => (
                <div key={night.night} className="card">
                  <strong>Night {night.night}</strong>
                  {night.note && <p style={{ color: "#4b5563" }}>{night.note}</p>}
                  <div className="stack">
                    {night.tracks.map((track) => (
                      <span key={track.id}>{track.title}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
