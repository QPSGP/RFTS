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
  const [currentNight, setCurrentNight] = useState(1);
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

    const checkAuth = (retry = false) =>
      fetch("/api/user/me", { credentials: "include" })
        .then((res) => {
          if (!res.ok && retry) {
            return new Promise<Response>((resolve) =>
              setTimeout(() => fetch("/api/user/me", { credentials: "include" }).then(resolve), 400)
            );
          }
          return res;
        })
        .then((res) => {
          if (!res.ok) throw new Error("Unauthorized");
          return res.json();
        });

    checkAuth(false)
      .then((data) => {
        const nextProfile = data.profile;
        setProfile(nextProfile || null);
        const subscriptionStatus = nextProfile?.subscriptionStatus;
        setStatus(subscriptionStatus === "active" ? "active" : "inactive");
        if (subscriptionStatus === "active") {
          fetch("/api/user/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "viewed_console" }),
            credentials: "include"
          }).catch(() => {});
          fetch("/api/user/schedule?nights=7", { credentials: "include" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              setSchedule(data?.schedule || []);
              setCurrentNight(typeof data?.currentNight === "number" ? data.currentNight : 1);
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
      .catch(() => checkAuth(true).then((data) => {
        const nextProfile = data.profile;
        setProfile(nextProfile || null);
        const subscriptionStatus = nextProfile?.subscriptionStatus;
        setStatus(subscriptionStatus === "active" ? "active" : "inactive");
        if (subscriptionStatus === "active") {
          fetch("/api/user/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "viewed_console" }), credentials: "include" }).catch(() => {});
          fetch("/api/user/schedule?nights=7", { credentials: "include" }).then((res) => (res.ok ? res.json() : null)).then((data) => { setSchedule(data?.schedule || []); setCurrentNight(typeof data?.currentNight === "number" ? data.currentNight : 1); setPrepAudio(data?.prepAudio || null); setGapHours(data?.gapHours || 2.5); }).catch(() => setSchedule([]));
          fetch("/api/user/personalized-audios", { credentials: "include" }).then((res) => (res.ok ? res.json() : null)).then((data) => setPersonalizedAudios(data?.items || [])).catch(() => setPersonalizedAudios([]));
        }
      }).catch(() => setStatus("loggedOut")));
  }, []);

  if (status === "loading") {
    return null;
  }

  if (status === "loggedOut") {
    if (typeof window !== "undefined") {
      window.location.replace("/member/login");
    }
    return null;
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
          {schedule.length > 0 && (() => {
            const tonightIndex = Math.max(0, Math.min(currentNight - 1, schedule.length - 1));
            const tonight = schedule[tonightIndex];
            return (
            <div style={{ marginTop: 12 }}>
              <strong>Tonight&apos;s lineup{schedule.length > 1 ? ` (Night ${tonight.night})` : ""}</strong>
              <div className="stack" style={{ marginTop: 8 }}>
                {prepAudio && (
                  <span>
                    Preparation audio: {prepAudio.title}
                  </span>
                )}
                {tonight.tracks.map((track, index) => (
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
            );
          })()}
        </div>
        {schedule.length > 0 && (() => {
          const tonightIndex = Math.max(0, Math.min(currentNight - 1, schedule.length - 1));
          const tonight = schedule[tonightIndex];
          return (
          <SessionPlayer
            ref={sessionRef}
            prepAudio={prepAudio}
            firstTrack={
              tonight.tracks[0]
                ? { title: tonight.tracks[0].title, url: tonight.tracks[0].audioUrl }
                : null
            }
            secondTrack={
              tonight.tracks[1]
                ? { title: tonight.tracks[1].title, url: tonight.tracks[1].audioUrl }
                : null
            }
            gapHours={gapHours}
            autoStart={autoStart}
            onSessionStart={() => {
              fetch("/api/user/session-used", { method: "POST", credentials: "include" }).catch(() => {});
            }}
          />
          );
        })() }
        {status === "active" && profile && (
          <div className="card">
            <h3>Sessions per night</h3>
            <p style={{ color: "#4b5563", marginBottom: 12 }}>
              Choose 1 or 2 recordings each night (default is 2). You can change this anytime.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="radio"
                  name="playsPerNightConsole"
                  checked={(profile?.playsPerNight ?? 2) === 2}
                  onChange={async () => {
                    const res = await fetch("/api/user/goals", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ playsPerNight: 2 }),
                      credentials: "include"
                    });
                    if (res.ok && profile) {
                      setProfile({ ...profile, playsPerNight: 2 });
                      const scheduleRes = await fetch("/api/user/schedule?nights=7", { credentials: "include" });
                      if (scheduleRes.ok) {
                        const data = await scheduleRes.json();
                        setSchedule(data?.schedule || []);
                        setCurrentNight(typeof data?.currentNight === "number" ? data.currentNight : 1);
                      }
                    }
                  }}
                />
                2 per night (recommended)
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="radio"
                  name="playsPerNightConsole"
                  checked={(profile?.playsPerNight ?? 2) === 1}
                  onChange={async () => {
                    const res = await fetch("/api/user/goals", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ playsPerNight: 1 }),
                      credentials: "include"
                    });
                    if (res.ok && profile) {
                      setProfile({ ...profile, playsPerNight: 1 });
                      const scheduleRes = await fetch("/api/user/schedule?nights=7", { credentials: "include" });
                      if (scheduleRes.ok) {
                        const data = await scheduleRes.json();
                        setSchedule(data?.schedule || []);
                        setCurrentNight(typeof data?.currentNight === "number" ? data.currentNight : 1);
                      }
                    }
                  }}
                />
                1 per night
              </label>
            </div>
          </div>
        )}
        {schedule.length > 0 && (
          <div className="card">
            <h3>Session Cycle</h3>
            <p>
              Your sessions rotate through the goals you selected. Each night lists the
              recordings scheduled to play. You can change your sessions-per-night setting above and your goals anytime.
            </p>
            <div className="grid" style={{ marginTop: 12 }}>
              {schedule.map((night) => (
                <div key={night.night} className="card" style={night.night === currentNight ? { borderColor: "var(--color-primary, #6366f1)", borderWidth: 2 } : undefined}>
                  <strong>Night {night.night}{night.night === currentNight ? " (tonight)" : ""}</strong>
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
