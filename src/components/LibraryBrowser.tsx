"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Interest, LibraryItem } from "@/lib/types";

type LibraryBrowserProps = {
  interests: Interest[];
  library: LibraryItem[];
};

export default function LibraryBrowser({ interests, library }: LibraryBrowserProps) {
  const [status, setStatus] = useState<"loading" | "loggedOut" | "inactive" | "active">(
    "loading"
  );
  const [adultConsent, setAdultConsent] = useState(false);
  const [hasVerifiedAge, setHasVerifiedAge] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        setUserEmail(data.profile?.email || "");
        setAdultConsent(!!data.profile?.adultConsent);
        setHasVerifiedAge(!!data.profile?.hasVerifiedAge);
        const subscriptionStatus = data.profile?.subscriptionStatus;
        setStatus(subscriptionStatus === "active" ? "active" : "inactive");
      })
      .catch(() => setStatus("loggedOut"));
  }, []);

  const isCgmr = (item: LibraryItem) =>
    (item.categories || []).some((category) => category.toLowerCase() === "cgmr");

  const grouped = useMemo(() => {
    const byInterest = new Map<string, LibraryItem[]>();
    interests.forEach((interest) => {
      byInterest.set(interest.id, []);
    });
    const unassigned: LibraryItem[] = [];
    const visibleLibrary = library.filter((item) => !isCgmr(item));
    const canAccessAdult = adultConsent && hasVerifiedAge;
    const libraryForUser = visibleLibrary.filter(
      (item) => !item.isAdult || canAccessAdult
    );

    libraryForUser.forEach((item) => {
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
  }, [interests, library, adultConsent, hasVerifiedAge]);

  const renderCard = (item: LibraryItem) => {
    const isLocked = status !== "active";
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
        {isUserLocked && <p style={{ color: "#b91c1c" }}>Assigned user only</p>}
      </div>
    );

    if (isLocked || isUserLocked || !item.audioUrl) {
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
        <h2>Adult Content</h2>
        <p>
          Adult content is only viewable to members who are 18+ and have given consent
          during registration. A birthdate is required to verify age. Without a
          birthdate, adult content is not available.
        </p>
        <p style={{ fontWeight: 600 }}>
          Adult Consent: {adultConsent ? "Granted" : "Not Granted"}
          {adultConsent && (
            <> · Age verified: {hasVerifiedAge ? "Yes – you can view adult content" : "No – add birthdate in your profile"}</>
          )}
        </p>
      </div>

      {library.length > 0 && (
        <section>
          <h3>All Audios</h3>
          <div
            style={{
              maxHeight: 320,
              overflowY: "auto",
              paddingRight: 8,
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: 8
            }}
            className="scroll-list"
          >
            {library
              .filter((item) => !(item.categories || []).some((c) => c.toLowerCase() === "cgmr"))
              .filter((item) => !item.isAdult || (adultConsent && hasVerifiedAge))
              .map((item) => (
                <Link
                  key={item.id}
                  href={`/library/${item.id}`}
                  style={{
                    display: "block",
                    padding: "8px 12px",
                    textDecoration: "none",
                    color: "inherit",
                    borderBottom: "1px solid var(--border, #e5e7eb)"
                  }}
                >
                  {item.title}
                  {item.isAdult && (
                    <>
                      {" "}
                      <span className="badge">Adult</span>
                    </>
                  )}
                </Link>
              ))}
          </div>
        </section>
      )}

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
      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => document.getElementById("library-top")?.scrollIntoView({ behavior: "smooth" })}
        >
          ↑ Jump to top
        </button>
      </div>
    </div>
  );
}
