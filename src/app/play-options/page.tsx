"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ScreenWakeToggle from "@/components/ScreenWakeToggle";
import SessionPlayer, { SessionPlayerHandle } from "@/components/SessionPlayer";

export default function PlayOptionsPage() {
  const [status, setStatus] = useState<"loading" | "loggedOut" | "inactive" | "active">(
    "loading"
  );
  const [profile, setProfile] = useState<{
    email: string;
    goalIds: string[];
    subscriptionStatus: string | null;
    subscriptionTier: string | null;
    playsPerNight: number;
  } | null>(null);
  const [schedule, setSchedule] = useState<
    { night: number; tracks: { id: string; title: string; audioUrl: string }[]; note?: string }[]
  >([]);
  const [prepAudio, setPrepAudio] = useState<{ title: string; url: string } | null>(
    null
  );
  const [gapHours, setGapHours] = useState(2.5);
  const [autoStart, setAutoStart] = useState(false);
  const [personalizedAudios, setPersonalizedAudios] = useState<
    { id: string; title: string }[]
  >([]);
  const sessionRef = useRef<SessionPlayerHandle | null>(null);

  const derivedTracks = useMemo(() => {
    const map = new Map<string, { id: string; title: string }>();
    schedule.forEach((night) => {
      night.tracks.forEach((track) => {
        if (!map.has(track.id)) {
          map.set(track.id, { id: track.id, title: track.title });
        }
      });
    });
    return Array.from(map.values());
  }, [schedule]);

  const logout = async () => {
    await fetch("/api/user/logout", { method: "POST", credentials: "include" });
    window.location.href = "/member/login";
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAutoStart(params.get("autoplay") === "1");
    fetch("/api/user/me", { credentials: "include" })
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
          fetch("/api/user/schedule?nights=7", { credentials: "include" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              setSchedule(data?.schedule || []);
              setPrepAudio(data?.prepAudio || null);
              setGapHours(data?.gapHours || 2.5);
            })
            .catch(() => setSchedule([]));
          fetch("/api/user/personalized-audios", { credentials: "include" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setPersonalizedAudios(data?.items || []))
            .catch(() => setPersonalizedAudios([]));
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
          <h1>Activate your RFTS membership</h1>
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
            <button className="button button-secondary" type="button" onClick={logout}>
              Log Out
            </button>
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
          <button
            className="button"
            type="button"
            style={{ padding: "14px 22px", fontSize: 16 }}
            onClick={() => {
              sessionRef.current?.startSession();
              const sessionEl = document.getElementById("meditation-session");
              sessionEl?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Start Session
          </button>
          <a className="button button-secondary" href="/library">
            Open Library
          </a>
          <button className="button button-secondary" type="button" onClick={logout}>
            Log Out
          </button>
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
        <div className="card">
          <h3>Your Goals</h3>
          <p>Manage the goals that drive your session lineup.</p>
          <a className="button button-secondary" href="/goals">
            Update Goals
          </a>
        </div>
        <div className="card">
          <h3>Audios from your goals</h3>
          <p>These audios are automatically included based on your goal selections.</p>
          {derivedTracks.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No goal-based audios listed yet.</p>
          ) : (
            <div className="goal-list" style={{ marginTop: 8 }}>
              {derivedTracks.map((track) => (
                <div key={track.id} className="goal-item">
                  {track.title}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card" id="meditation-library">
          <h3>Meditation Library</h3>
          <p>Browse the full audio library and play any track on demand. This will not affect your sessions!</p>
          <a className="button" href="/library" style={{ marginTop: 12 }}>
            Open Library
          </a>
        </div>
        <div className="card" id="meditation-session">
          <h3>Meditation Session</h3>
          <p>
            Start a guided session tailored to your goals. Each session plays your
            preparation audio, then your first goal recording. A second recording
            is scheduled {gapHours} hours later if the admin has enabled 2 sessions
            per night for your account.
          </p>
          {schedule.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong>Tonight's lineup</strong>
              <div className="stack" style={{ marginTop: 8 }}>
                {prepAudio && (
                  <span>
                    Preparation audio: {prepAudio.title}
                  </span>
                )}
                {schedule[0].tracks.map((track, index) => (
                  <a
                    key={track.id}
                    className="button button-secondary"
                    href={`/library/${track.id}`}
                  >
                    Play {index === 1 ? "Second" : "First"}: {track.title}
                  </a>
                ))}
              </div>
              {personalizedAudios.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong>Personalized audio (view only)</strong>
                  <div className="goal-list" style={{ marginTop: 6 }}>
                    {personalizedAudios.map((item) => (
                      <div key={item.id} className="goal-item">
                        {item.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {schedule.length > 0 && (
          <SessionPlayer
            ref={sessionRef}
            prepAudio={prepAudio}
            firstTrack={
              schedule[0].tracks[0]
                ? { title: schedule[0].tracks[0].title, url: schedule[0].tracks[0].audioUrl }
                : null
            }
            secondTrack={
              schedule[0].tracks[1]
                ? { title: schedule[0].tracks[1].title, url: schedule[0].tracks[1].audioUrl }
                : null
            }
            gapHours={gapHours}
            autoStart={autoStart}
          />
        )}
        {schedule.length > 0 && (
          <div className="card">
            <h3>Session Cycle</h3>
            <p>
              Your sessions rotate through the goals you selected. Each night lists the
              recordings scheduled to play based on the admin-controlled 1 or 2
              sessions per night setting.
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
