"use client";

import { useEffect, useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import { libraryItemCoverSrc } from "@/lib/library-display";
import type { LibraryItem } from "@/lib/types";

type AudioGateProps = {
  item: LibraryItem;
};

export default function AudioGate({ item }: AudioGateProps) {
  const [status, setStatus] = useState<"loading" | "loggedOut" | "inactive" | "active">(
    "loading"
  );
  const [hasAdultConsent, setHasAdultConsent] = useState(false);
  const [hasVerifiedAge, setHasVerifiedAge] = useState(false);
  const [wantsPracticeGrowth, setWantsPracticeGrowth] = useState(false);

  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        setHasAdultConsent(!!data.profile?.adultConsent);
        setHasVerifiedAge(!!data.profile?.hasVerifiedAge);
        setWantsPracticeGrowth(!!data.profile?.wantsPracticeGrowth);
        const subscriptionStatus = data.profile?.subscriptionStatus;
        setStatus(subscriptionStatus === "active" ? "active" : "inactive");
      })
      .catch(() => setStatus("loggedOut"));
  }, []);

  const isCgmr =
    item.categories?.some((category) => category.toLowerCase() === "cgmr") ?? false;
  const isSpecial =
    item.categories?.some((category) => category.toLowerCase() === "special") ?? false;

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

  if (isSpecial && !wantsPracticeGrowth) {
    return (
      <div className="card">
        <h2>Build Practice</h2>
        <p>
          This audio is for therapists, healers, and coaches. Update your profile
          to indicate you are or would like to be one to access it.
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

  const streamUrl = `/api/stream/audio?id=${item.id}`;
  const prepAudioUrl = "/api/stream/audio?prep=1";
  return (
    <AudioPlayer
      title={item.title}
      skuCode={item.skuCode}
      description={item.description || "Description pending."}
      audioUrl={streamUrl}
      coverUrl={libraryItemCoverSrc(item)}
      prepAudioUrl={prepAudioUrl}
      showCover
    />
  );
}
