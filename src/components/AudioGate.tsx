"use client";

import { useEffect, useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import type { LibraryItem } from "@/lib/types";

const ADULT_KEY = "rfts_adult_consent";

type AudioGateProps = {
  item: LibraryItem;
};

export default function AudioGate({ item }: AudioGateProps) {
  const [status, setStatus] = useState<"loading" | "loggedOut" | "inactive" | "active">(
    "loading"
  );
  const [hasAdultConsent, setHasAdultConsent] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    setHasAdultConsent(localStorage.getItem(ADULT_KEY) === "true");
    fetch("/api/user/me")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        setUserEmail(data.profile?.email || "");
        const subscriptionStatus = data.profile?.subscriptionStatus;
        setStatus(subscriptionStatus === "active" ? "active" : "inactive");
      })
      .catch(() => setStatus("loggedOut"));
  }, []);

  const grantAdultConsent = () => {
    localStorage.setItem(ADULT_KEY, "true");
    setHasAdultConsent(true);
  };

  const isUserAllowed =
    !item.allowedUserEmails || item.allowedUserEmails.length === 0
      ? true
      : item.allowedUserEmails.some(
          (email) => email.toLowerCase() === userEmail.toLowerCase()
        );

  if (status === "loading") {
    return null;
  }

  if (status === "loggedOut") {
    return (
      <div className="card">
        <h2>Member Login Required</h2>
        <p>
          Log in to start your personalized sessions and access your library.
        </p>
        <a className="button" href="/member/login">
          Member Login
        </a>
      </div>
    );
  }

  if (status === "inactive") {
    return (
      <div className="card">
        <h2>Subscription Required</h2>
        <p>
          This audio is available to active subscribers. Choose a plan to continue.
        </p>
        <a className="button" href="/signup/step-1-subscription-selection">
          Choose Subscription
        </a>
      </div>
    );
  }

  if (item.isAdult && !hasAdultConsent) {
    return (
      <div className="card">
        <h2>Adult Content</h2>
        <p>
          This recording is marked as adult content. Please confirm you are 18+
          to continue.
        </p>
        <button className="button" onClick={grantAdultConsent}>
          I am 18+ and consent
        </button>
      </div>
    );
  }

  if (!isUserAllowed) {
    return (
      <div className="card">
        <h2>Access Restricted</h2>
        <p>This audio is assigned to specific users only.</p>
      </div>
    );
  }

  return (
    <AudioPlayer
      title={item.title}
      description={item.description || "Description pending."}
      audioUrl={item.audioUrl}
      coverUrl={item.coverUrl || "/covers/placeholder.png"}
    />
  );
}
