"use client";

import { useEffect, useState } from "react";
import PlayOptionsClient from "./PlayOptionsClient";
import type { PlayOptionsProfile } from "./PlayOptionsClient";

const fetchMe = (): Promise<PlayOptionsProfile | null> =>
  fetch("/api/user/me", { credentials: "include", cache: "no-store" })
    .then((res) => {
      if (res.ok) return res.json();
      return Promise.reject(new Error("Unauthorized"));
    })
    .then((data) => {
      const p = data?.profile;
      if (p && typeof p.email === "string") {
        return {
          email: p.email,
          goalIds: Array.isArray(p.goalIds) ? p.goalIds : [],
          subscriptionStatus: p.subscriptionStatus ?? null,
          subscriptionTier: p.subscriptionTier ?? null,
          playsPerNight: typeof p.playsPerNight === "number" ? p.playsPerNight : 2
        };
      }
      return null;
    });

const fetchMeWithRetries = (retries = 4, delayMs = 800): Promise<PlayOptionsProfile | null> =>
  fetchMe().catch(() => {
    if (retries <= 0) return Promise.resolve(null);
    return new Promise((resolve) =>
      setTimeout(() => fetchMeWithRetries(retries - 1, delayMs).then(resolve), delayMs)
    );
  });

export default function PlayOptionsPage() {
  const [profile, setProfile] = useState<PlayOptionsProfile | null | "loading">("loading");

  useEffect(() => {
    fetchMeWithRetries()
      .then((p) => setProfile(p))
      .catch(() => setProfile(null));
  }, []);

  if (profile === "loading") {
    return (
      <main>
        <section className="hero section">
          <p>Loading…</p>
        </section>
      </main>
    );
  }

  if (profile === null) {
    return (
      <main>
        <section className="hero section">
          <span className="pill">Log in</span>
          <h1>Please log in</h1>
          <p>You need to be signed in to view Play Options.</p>
          <div className="cta-row" style={{ marginTop: 16 }}>
            <a className="button" href="/member/login">
              Go to member login
            </a>
          </div>
        </section>
      </main>
    );
  }

  return <PlayOptionsClient initialProfile={profile} />;
}
