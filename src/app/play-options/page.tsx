"use client";

import { useEffect, useState } from "react";
import ScreenWakeToggle from "@/components/ScreenWakeToggle";

export default function PlayOptionsPage() {
  const [status, setStatus] = useState<"loading" | "loggedOut" | "inactive" | "active">(
    "loading"
  );

  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        const subscriptionStatus = data.profile?.subscriptionStatus;
        setStatus(subscriptionStatus === "active" ? "active" : "inactive");
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
        </div>
      </section>
    </main>
  );
}
