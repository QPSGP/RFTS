"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Interest, LibraryItem } from "@/lib/storage";

const ADULT_KEY = "rfts_adult_consent";

type LibraryBrowserProps = {
  interests: Interest[];
  library: LibraryItem[];
};

export default function LibraryBrowser({ interests, library }: LibraryBrowserProps) {
  const [status, setStatus] = useState<"loading" | "loggedOut" | "inactive" | "active">(
    "loading"
  );
  const [adultConsent, setAdultConsent] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    setAdultConsent(localStorage.getItem(ADULT_KEY) === "true");
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

  const grouped = useMemo(() => {
    const byInterest = new Map<string, LibraryItem[]>();
    interests.forEach((interest) => {
      byInterest.set(interest.id, []);
    });
    const unassigned: LibraryItem[] = [];

    library.forEach((item) => {
      if (!item.interestIds.length) {
        unassigned.push(item);
        return;
      }
      item.interestIds.forEach((id) => {
        if (!byInterest.has(id)) {
          byInterest.set(id, []);
        }
        byInterest.get(id)?.push(item);
      });
    });

    return { byInterest, unassigned };
  }, [interests, library]);

  const toggleAdultConsent = () => {
    const next = !adultConsent;
    localStorage.setItem(ADULT_KEY, String(next));
    setAdultConsent(next);
  };

  const renderCard = (item: LibraryItem) => {
    const isLocked = status !== "active";
    const isAdultLocked = item.isAdult && !adultConsent;
    const isUserLocked =
      item.allowedUserEmails && item.allowedUserEmails.length > 0
        ? !item.allowedUserEmails.some(
            (email) => email.toLowerCase() === userEmail.toLowerCase()
          )
        : false;
    const content = (
      <div className="card">
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={`${item.title} cover`}
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              marginBottom: 12
            }}
          />
        ) : (
          <div className="card" style={{ marginBottom: 12 }}>
            Cover pending
          </div>
        )}
        <strong>{item.title}</strong>
        <p style={{ color: "#4b5563" }}>
          {item.description || "Description pending."}
        </p>
        {item.isAdult && <span className="badge">Adult</span>}
        {isLocked && <p style={{ color: "#b91c1c" }}>Subscriber access required</p>}
        {isAdultLocked && <p style={{ color: "#b91c1c" }}>Adult consent required</p>}
        {isUserLocked && <p style={{ color: "#b91c1c" }}>Assigned user only</p>}
      </div>
    );

    if (isLocked || isAdultLocked || isUserLocked || !item.audioUrl) {
      return <div key={item.id}>{content}</div>;
    }

    return (
      <Link key={item.id} href={`/library/${item.id}`}>
        {content}
      </Link>
    );
  };

  return (
    <div className="grid" style={{ gap: 24 }}>
      {status === "loggedOut" && (
        <div className="card">
          <h2>Member Login Required</h2>
          <p>Log in to access subscriber-only audio sessions.</p>
          <a className="button" href="/member/login">
            Member Login
          </a>
        </div>
      )}
      {status === "inactive" && (
        <div className="card">
          <h2>Subscription Required</h2>
          <p>Activate your subscription to unlock playback.</p>
          <a className="button" href="/signup/step-1-subscription-selection">
            Choose Subscription
          </a>
        </div>
      )}
      <div className="card">
        <h2>Adult Content Controls</h2>
        <p>Enable adult content access if applicable.</p>
        <button className="button button-secondary" onClick={toggleAdultConsent}>
          Adult Consent: {adultConsent ? "Granted" : "Not Granted"}
        </button>
      </div>

      {interests.map((interest) => {
        const items = grouped.byInterest.get(interest.id) || [];
        if (!items.length) {
          return null;
        }
        return (
          <section key={interest.id}>
            <h3>{interest.name}</h3>
            <div className="grid grid-3">{items.map(renderCard)}</div>
          </section>
        );
      })}

      {grouped.unassigned.length > 0 && (
        <section>
          <h3>Unassigned</h3>
          <div className="grid grid-3">
            {grouped.unassigned.map(renderCard)}
          </div>
        </section>
      )}
    </div>
  );
}
