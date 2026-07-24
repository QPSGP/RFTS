"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ScreenWakeToggle from "@/components/ScreenWakeToggle";
import PlayOptionsAndroidTips from "@/components/PlayOptionsAndroidTips";
import SessionPlayer, { SessionPlayerHandle } from "@/components/SessionPlayer";
import MemberListenProgress from "@/components/MemberListenProgress";
import { getMemberTonightTrackItems } from "@/lib/schedule-progress";

export default function PlayOptionsPage() {
  const [status, setStatus] = useState<"loading" | "loggedOut" | "inactive" | "active">(
    "loading"
  );
  const [profile, setProfile] = useState<{
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    goalIds: string[];
    subscriptionStatus: string | null;
    subscriptionTier: string | null;
    playsPerNight: number;
    isManaged?: boolean;
    hadLgdSession?: boolean;
  } | null>(null);
  const [lgdConsoleOffer, setLgdConsoleOffer] = useState(true);
  const [lgdIntakeEnabled, setLgdIntakeEnabled] = useState(true);
  const [lgdPriceLabel, setLgdPriceLabel] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<
    { night: number; tracks: { id: string; title: string; skuCode?: string; audioUrl: string }[]; note?: string }[]
  >([]);
  const [currentNight, setCurrentNight] = useState(1);
  const [currentAudioNumber, setCurrentAudioNumber] = useState(1);
  const [completedScheduleNights, setCompletedScheduleNights] = useState(0);
  const [prepAudio, setPrepAudio] = useState<{ title: string; url: string } | null>(
    null
  );
  const [gapHours, setGapHours] = useState(2.5);
  const [autoStart, setAutoStart] = useState(false);
  const [personalizedAudios, setPersonalizedAudios] = useState<
    { id: string; title: string }[]
  >([]);
  const [nextInCue, setNextInCue] = useState<{ id: string; title: string; skuCode?: string }[]>([]);
  /** After a full listen advances the schedule, Next Audio should start without advancing again. */
  const [nextAudioNeedsAdvance, setNextAudioNeedsAdvance] = useState(true);
  const sessionRef = useRef<SessionPlayerHandle | null>(null);
  const playSecondFromUrlRef = useRef(false);

  const loadSchedule = useCallback(async () => {
    const scheduleRes = await fetch(`/api/user/schedule?nights=21&_t=${Date.now()}`, {
      credentials: "include",
      cache: "no-store"
    });
    if (!scheduleRes.ok) return;
    const data = await scheduleRes.json();
    setSchedule(data?.schedule || []);
    setCurrentNight(typeof data?.currentNight === "number" ? data.currentNight : 1);
    setCurrentAudioNumber(
      typeof data?.currentAudioNumber === "number"
        ? data.currentAudioNumber
        : typeof data?.completedScheduleNights === "number"
          ? data.completedScheduleNights + 1
          : 1
    );
    setCompletedScheduleNights(
      typeof data?.completedScheduleNights === "number"
        ? data.completedScheduleNights
        : Math.max(0, (typeof data?.currentAudioNumber === "number" ? data.currentAudioNumber : 1) - 1)
    );
    setNextInCue(Array.isArray(data?.nextInCue) ? data.nextInCue : []);
    setPrepAudio(data?.prepAudio || null);
    setGapHours(typeof data?.gapHours === "number" ? data.gapHours : 2.5);
  }, []);

  const playNextInRotation = useCallback(async () => {
    if (nextAudioNeedsAdvance) {
      await fetch("/api/user/schedule-night-complete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nightCompleted: currentNight })
      }).catch(() => {});
    }
    await loadSchedule();
    setNextAudioNeedsAdvance(true);
    requestAnimationFrame(() => {
      sessionRef.current?.startSession();
      document.getElementById("meditation-session")?.scrollIntoView({ behavior: "smooth" });
    });
  }, [currentNight, loadSchedule, nextAudioNeedsAdvance]);

  const playsPerNightSetting = (profile?.playsPerNight ?? 2) === 1 ? 1 : 2;
  const currentPlaylist = nextInCue;

  const tonightTrackItems = useMemo(
    () => getMemberTonightTrackItems(schedule, completedScheduleNights, playsPerNightSetting),
    [schedule, completedScheduleNights, playsPerNightSetting]
  );

  const tonightTracksWithUrls = useMemo(() => {
    const byId = new Map<
      string,
      { id: string; title: string; skuCode?: string; audioUrl: string }
    >();
    for (const night of schedule) {
      for (const track of night.tracks) {
        byId.set(track.id, track);
      }
    }
    return tonightTrackItems
      .map((item) => {
        const full = byId.get(item.id);
        if (!full) return null;
        return full;
      })
      .filter((t): t is { id: string; title: string; skuCode?: string; audioUrl: string } => !!t);
  }, [schedule, tonightTrackItems]);

  const logout = async () => {
    await fetch("/api/user/logout", { method: "POST", credentials: "include" });
    window.location.href = "/member/login";
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("playSecond") === "1") {
      playSecondFromUrlRef.current = true;
    } else {
      if (params.get("autoplay") === "1") setAutoStart(true);
      if (params.get("autoplay") === "0") setAutoStart(false);
    }
    fetch("/api/member/lgd-access", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        setLgdConsoleOffer(data.consoleOffer !== false);
        setLgdIntakeEnabled(data.electronicIntakeEnabled !== false);
        if (data.priceLabel) setLgdPriceLabel(data.priceLabel);
      })
      .catch(() => {});

    fetch("/api/user/me", { credentials: "include", cache: "no-store" })
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
          fetch("/api/user/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "viewed_console", details: "/play-options" }),
            credentials: "include"
          }).catch(() => {});
          fetch("/api/user/schedule?nights=21", { credentials: "include" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              setSchedule(data?.schedule || []);
              setCurrentNight(typeof data?.currentNight === "number" ? data.currentNight : 1);
              setCurrentAudioNumber(
                typeof data?.currentAudioNumber === "number"
                  ? data.currentAudioNumber
                  : typeof data?.completedScheduleNights === "number"
                    ? data.completedScheduleNights + 1
                    : 1
              );
              setCompletedScheduleNights(
                typeof data?.completedScheduleNights === "number"
                  ? data.completedScheduleNights
                  : Math.max(0, (typeof data?.currentAudioNumber === "number" ? data.currentAudioNumber : 1) - 1)
              );
              setPrepAudio(data?.prepAudio || null);
              setGapHours(data?.gapHours || 2.5);
              setNextInCue(Array.isArray(data?.nextInCue) ? data.nextInCue : []);
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

  useEffect(() => {
    if (!playSecondFromUrlRef.current) return;
    if (status !== "active" || !profile || schedule.length === 0) return;
    if ((profile.playsPerNight ?? 2) === 1) {
      playSecondFromUrlRef.current = false;
      return;
    }
    if (tonightTracksWithUrls.length < 2) {
      playSecondFromUrlRef.current = false;
      return;
    }
    playSecondFromUrlRef.current = false;
    requestAnimationFrame(() => {
      sessionRef.current?.playSecond();
      document.getElementById("meditation-session")?.scrollIntoView({ behavior: "smooth" });
      const u = new URL(window.location.href);
      if (u.searchParams.get("playSecond") === "1") {
        u.searchParams.delete("playSecond");
        window.history.replaceState({}, "", `${u.pathname}${u.search}${u.hash}`);
      }
    });
  }, [status, profile, schedule, tonightTracksWithUrls.length]);

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
    const inactiveName =
      profile?.firstName || profile?.lastName
        ? [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim()
        : profile?.email ?? "";
    return (
      <main className="play-options-main">
        <section className="hero section">
          <span className="pill">Subscription Required</span>
          {inactiveName && (
            <p style={{ marginBottom: 4, fontWeight: 600, fontSize: 18 }}>
              Hi, {inactiveName}
            </p>
          )}
          <p style={{ marginBottom: 8, color: "var(--color-muted, #64748b)", fontSize: 14 }}>
            Membership: Inactive
          </p>
          <h1>Activate your RFTS membership</h1>
          <p>
            Your account is ready, but a subscription is required to start sessions. Go to My
            Profile to complete payment or manage billing if you already pay through Stripe.
          </p>
          <div className="cta-row" style={{ marginTop: 16 }}>
            <a className="button" href="/member/profile">
              My Profile
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

  const displayName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
    profile?.email ||
    "";
  const getTierLabel = (tier: string | null) => {
    if (tier === "platinum_managed") return "Platinum Managed Member";
    if (tier === "platinum") return "Gold Member";
    return tier || "Membership";
  };
  const membershipLabel =
    profile?.subscriptionStatus === "active"
      ? profile?.subscriptionTier
        ? `Membership: ${getTierLabel(profile.subscriptionTier)}`
        : "Membership: Active"
      : "Membership: Inactive";

  const showPlaySecondHero =
    status === "active" &&
    playsPerNightSetting === 2 &&
    tonightTracksWithUrls.length > 1;

  const showNextAudioHero =
    status === "active" && playsPerNightSetting === 1 && nextInCue.length > 1;

  return (
    <main className="play-options-main">
      <section className="hero section">
        <span className="pill">Nightly Sessions</span>
        {displayName && (
          <p style={{ marginBottom: 4, fontWeight: 600, fontSize: 18 }}>
            Hi, {displayName}
          </p>
        )}
        <p style={{ marginBottom: 8, color: "var(--color-muted, #64748b)", fontSize: 14 }}>
          {membershipLabel}
        </p>
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
          {showPlaySecondHero && (
            <button
              className="button button-secondary"
              type="button"
              style={{ padding: "14px 22px", fontSize: 16 }}
              onClick={() => {
                sessionRef.current?.playSecond();
                document.getElementById("meditation-session")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Play Second Audio
            </button>
          )}
          {showNextAudioHero && (
            <button
              className="button button-secondary"
              type="button"
              style={{ padding: "14px 22px", fontSize: 16 }}
              onClick={() => {
                void playNextInRotation();
              }}
            >
              Next Audio
            </button>
          )}
          <a className="button button-secondary" href="/library">
            Open Library
          </a>
          <a className="button button-secondary" href="/member/profile">
            My Profile
          </a>
          <button className="button button-secondary" type="button" onClick={logout}>
            Log Out
          </button>
        </div>
      </section>
      {profile && !profile.isManaged && profile.goalIds?.length === 0 && (
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
      {profile && !profile.hadLgdSession && lgdConsoleOffer && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h3>Life Guidance Discovery</h3>
          <p>
            Complete an electronic Life Guidance Discovery to prepare your facilitator and draft a
            customized Goal Manifestation script specific to you.
            {lgdPriceLabel ? ` Reference packaging: ${lgdPriceLabel}.` : ""}
          </p>
          <a className="button" href="/member/lgd">
            Start Life Guidance Discovery
          </a>
        </section>
      )}
      {profile && profile.isManaged && (
        <section className="card" style={{ marginBottom: 16, background: "#f0fdf4", borderColor: "#bbf7d0" }}>
          <h3>Managed Account</h3>
          <p style={{ color: "#166534" }}>
            Your content is customized by your administrator. Your schedule uses the audios assigned to you.
          </p>
        </section>
      )}
      <PlayOptionsAndroidTips gapHours={gapHours} playsPerNight={playsPerNightSetting} />
      <section className="grid">
        <div className="card" id="meditation-session">
          <h3>Guided Meditation Audios</h3>
          <p>
            Start a guided audio tailored to your goals. Short intro relaxation music plays first,
            then your first goal audio starts. A second audio is scheduled {gapHours} hours later if
            you have enabled 2 audios per night (the second session also begins with intro
            relaxation music). Your schedule audio advances after you finish listening.
          </p>
          {schedule.length > 0 && tonightTracksWithUrls.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong>Current Lineup (Audio {currentAudioNumber})</strong>
              <div className="stack" style={{ marginTop: 8 }}>
                {tonightTracksWithUrls.map((track, index) => (
                  <a
                    key={`${currentNight}-${index}-${track.id}`}
                    className="button button-secondary"
                    href={`/library/${track.id}`}
                  >
                    Play
                    {playsPerNightSetting === 2
                      ? ` ${index === 1 ? "Second" : "First"}:`
                      : ":"}{" "}
                    {[track.skuCode, track.title].filter((x) => String(x || "").trim()).join(" – ")}
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
          {schedule.length > 0 && tonightTracksWithUrls.length > 0 && (
            <SessionPlayer
              ref={sessionRef}
              prepAudio={prepAudio}
              firstTrack={
                tonightTracksWithUrls[0]
                  ? {
                      title: tonightTracksWithUrls[0].title,
                      url: tonightTracksWithUrls[0].audioUrl,
                      skuCode: tonightTracksWithUrls[0].skuCode
                    }
                  : null
              }
              secondTrack={
                tonightTracksWithUrls[1]
                  ? {
                      title: tonightTracksWithUrls[1].title,
                      url: tonightTracksWithUrls[1].audioUrl,
                      skuCode: tonightTracksWithUrls[1].skuCode
                    }
                  : null
              }
              gapHours={gapHours}
              playsPerNight={playsPerNightSetting}
              autoStart={autoStart}
              onPlayNextAudio={
                playsPerNightSetting === 1 ? () => void playNextInRotation() : undefined
              }
              onSessionStart={() => {
                fetch("/api/user/session-used", { method: "POST", credentials: "include" }).catch(() => {});
              }}
              scheduleNightNumber={currentNight}
              onScheduleNightComplete={(night) => {
                /* Only after a full night is listened (both main audios when 2/night, or the single when 1/night). */
                fetch("/api/user/schedule-night-complete", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ nightCompleted: night })
                })
                  .then((r) => {
                    if (!r.ok) return undefined;
                    setNextAudioNeedsAdvance(false);
                    return loadSchedule();
                  })
                  .catch(() => {});
              }}
            />
          )}
        </div>
        {!profile?.isManaged && (
          <div className="card">
            <h3>Your Goals</h3>
            <p>Manage the goals that drive your session lineup.</p>
            <a className="button button-secondary" href="/goals">
              Update Goals
            </a>
          </div>
        )}
        {lgdIntakeEnabled ? (
          <div className="card">
            <h3>Life Guidance Discovery</h3>
            <p>
              Structured intake for your Goal Manifestation audio — session brief and script draft.
            </p>
            <a className="button button-secondary" href="/member/lgd">
              Open LGD intake
            </a>
          </div>
        ) : null}
        <div className="card">
          <h3>Current audios play list</h3>
          <p>
            The next 10 audios in your queue (starting from your current audio), by SKU and title. The same recording can appear
            more than once when it is on multiple steps in your rotation.
          </p>
          {currentPlaylist.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No audios in your play list yet.</p>
          ) : (
            <div className="goal-list" style={{ marginTop: 8 }}>
              {currentPlaylist.map((track, idx) => (
                <div key={`${track.id}-cue-${idx}`} className="goal-item">
                  {[track.skuCode, track.title].filter(Boolean).join(" – ")}
                </div>
              ))}
            </div>
          )}
        </div>
        <MemberListenProgress />
        <div className="card" id="meditation-library">
          <h3>Meditation Library</h3>
          <p>Browse the full audio library and play any track on demand. This will not affect your guided audio set!</p>
          <a className="button" href="/library" style={{ marginTop: 12 }}>
            Open Library
          </a>
        </div>
        {status === "active" && profile && (
          <div className="card">
            <h3>Audios per night</h3>
            <p style={{ color: "#4b5563", marginBottom: 12 }}>
              Choose 1 or 2 audios per night (default is 2). You can change this anytime.
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
                      const scheduleRes = await fetch(
                        `/api/user/schedule?nights=21&_t=${Date.now()}`,
                        { credentials: "include", cache: "no-store" }
                      );
                      if (scheduleRes.ok) {
                        const data = await scheduleRes.json();
                        setSchedule(data?.schedule || []);
                        setCurrentNight(typeof data?.currentNight === "number" ? data.currentNight : 1);
                        setCurrentAudioNumber(
                          typeof data?.currentAudioNumber === "number"
                            ? data.currentAudioNumber
                            : typeof data?.completedScheduleNights === "number"
                              ? data.completedScheduleNights + 1
                              : 1
                        );
                        setCompletedScheduleNights(
                          typeof data?.completedScheduleNights === "number"
                            ? data.completedScheduleNights
                            : Math.max(
                                0,
                                (typeof data?.currentAudioNumber === "number" ? data.currentAudioNumber : 1) -
                                  1
                              )
                        );
                        setNextInCue(Array.isArray(data?.nextInCue) ? data.nextInCue : []);
                        setProfile({ ...profile, playsPerNight: 2 });
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
                      const scheduleRes = await fetch(
                        `/api/user/schedule?nights=21&_t=${Date.now()}`,
                        { credentials: "include", cache: "no-store" }
                      );
                      if (scheduleRes.ok) {
                        const data = await scheduleRes.json();
                        setSchedule(data?.schedule || []);
                        setCurrentNight(typeof data?.currentNight === "number" ? data.currentNight : 1);
                        setCurrentAudioNumber(
                          typeof data?.currentAudioNumber === "number"
                            ? data.currentAudioNumber
                            : typeof data?.completedScheduleNights === "number"
                              ? data.completedScheduleNights + 1
                              : 1
                        );
                        setCompletedScheduleNights(
                          typeof data?.completedScheduleNights === "number"
                            ? data.completedScheduleNights
                            : Math.max(
                                0,
                                (typeof data?.currentAudioNumber === "number" ? data.currentAudioNumber : 1) -
                                  1
                              )
                        );
                        setNextInCue(Array.isArray(data?.nextInCue) ? data.nextInCue : []);
                        setProfile({ ...profile, playsPerNight: 1 });
                      }
                    }
                  }}
                />
                1 per night
              </label>
            </div>
          </div>
        )}
        <ScreenWakeToggle />
      </section>
    </main>
  );
}
