"use client";

import { useEffect, useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import type { LibraryItem } from "@/lib/types";

type AudioGateProps = {
  item: LibraryItem;
};

export default function AudioGate({ item }: AudioGateProps) {
  const [status, setStatus] = useState<"loading" | "loggedOut" | "inactive" | "active">(
    "loading"
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAdultConsent, setHasAdultConsent] = useState(false);
  const [hasVerifiedAge, setHasVerifiedAge] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        setIsAdmin(!!data.isAdmin);
        setUserEmail(data.profile?.email || "");
        setHasAdultConsent(!!data.profile?.adultConsent);
        setHasVerifiedAge(!!data.profile?.hasVerifiedAge);
        const subscriptionStatus = data.profile?.subscriptionStatus;
        setStatus(subscriptionStatus === "active" ? "active" : "inactive");
      })
      .catch(() => setStatus("loggedOut"));
  }, []);

  const isUserAllowed =
    isAdmin ||
    !item.allowedUserEmails ||
    item.allowedUserEmails.length === 0
      ? true
      : item.allowedUserEmails.some(
          (e) => e.trim().toLowerCase() === userEmail.trim().toLowerCase()
        );
  const isCgmr =
    item.categories?.some((category) => category.toLowerCase() === "cgmr") ?? false;

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

  if (isCgmr) {
    return (
      <div className="card">
        <h2>Personalized Audio</h2>
        <p>
          This recording is a custom CGMR track assigned by your admin. Playback is
          unavailable in the member library.
        </p>
      </div>
    );
  }

  if (item.isAdult && (!hasAdultConsent || !hasVerifiedAge)) {
    return (
      <div className="card">
        <h2>Adult Content</h2>
        <p>
          Adult content is only viewable to members who are 18+ and have given consent
          during registration. A birthdate is required to verify age. Without a
          birthdate, adult content is not available. Contact your admin to add or
          update your profile.
        </p>
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

  const streamUrl = `/api/stream/audio?id=${item.id}`;
  const prepAudioUrl = "/api/stream/audio?prep=1";
  const displayTitle =
    item.skuCode && !item.skuCode.toUpperCase().startsWith("MU")
      ? `${item.skuCode} — ${item.title}`
      : item.title;
  return (
    <AudioPlayer
      title={displayTitle}
      description={item.description || "Description pending."}
      audioUrl={streamUrl}
      coverUrl={item.coverUrl || "/covers/placeholder.png"}
      prepAudioUrl={prepAudioUrl}
      showCover={false}
    />
  );
}
