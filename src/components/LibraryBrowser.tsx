"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { libraryItemCoverSrc } from "@/lib/library-display";
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
  const [wantsPracticeGrowth, setWantsPracticeGrowth] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        setAdultConsent(!!data.profile?.adultConsent);
        setHasVerifiedAge(!!data.profile?.hasVerifiedAge);
        setWantsPracticeGrowth(!!data.profile?.wantsPracticeGrowth);
        const subscriptionStatus = data.profile?.subscriptionStatus;
        setStatus(subscriptionStatus === "active" ? "active" : "inactive");
        fetch("/api/user/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "viewed_library" }),
          credentials: "include"
        }).catch(() => {});
      })
      .catch(() => setStatus("loggedOut"));
  }, []);

  const isCgmr = (item: LibraryItem) =>
    (item.categories || []).some((category) => category.toLowerCase() === "cgmr");
  const isSpecial = (item: LibraryItem) =>
    (item.categories || []).some((category) => category.toLowerCase() === "special");
  const showSkuToMember = (item: LibraryItem) =>
    !!item.skuCode && !item.skuCode.toUpperCase().startsWith("MU");
  const displayTitle = (item: LibraryItem) =>
    showSkuToMember(item) && item.skuCode ? `${item.skuCode} — ${item.title}` : item.title;

  const canAccessAdult = adultConsent && hasVerifiedAge;
  const libraryFilteredByAccess = useMemo(() => {
    return library.filter((item) => {
      if (isCgmr(item)) return false;
      if (isSpecial(item) && !wantsPracticeGrowth) return false;
      if (item.isAdult && !canAccessAdult) return false;
      return true;
    });
  }, [library, adultConsent, hasVerifiedAge, wantsPracticeGrowth]);

  const grouped = useMemo(() => {
    const byInterest = new Map<string, LibraryItem[]>();
    interests.forEach((interest) => {
      byInterest.set(interest.id, []);
    });
    const unassigned: LibraryItem[] = [];
    const term = searchQuery.trim().toLowerCase();
    const libraryForUser = term
      ? libraryFilteredByAccess.filter(
          (item) =>
            (item.title || "").toLowerCase().includes(term) ||
            (item.skuCode || "").toLowerCase().includes(term)
        )
      : libraryFilteredByAccess;

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

    const sortByTitle = (a: LibraryItem, b: LibraryItem) =>
      (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
    byInterest.forEach((items, key) => byInterest.set(key, items.slice().sort(sortByTitle)));
    unassigned.sort(sortByTitle);

    return { byInterest, unassigned };
  }, [interests, libraryFilteredByAccess, searchQuery]);

  const coverImg = (item: LibraryItem, size: number) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={libraryItemCoverSrc(item)}
      alt=""
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: 8,
        flexShrink: 0,
        border: "1px solid #e5e7eb",
        background: "#f8fafc"
      }}
    />
  );

  const renderCard = (item: LibraryItem) => {
    const isLocked = status !== "active";
    const content = (
      <div className="card" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {coverImg(item, 96)}
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong>{displayTitle(item)}</strong>
          <p style={{ color: "#4b5563", marginTop: 4, marginBottom: 0 }}>
            {item.description || "Description pending."}
          </p>
          {item.isAdult && <span className="badge">Adult</span>}
          {isLocked && <p style={{ color: "#b91c1c" }}>Subscriber access required</p>}
        </div>
      </div>
    );

    if (isLocked || !item.audioUrl) {
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

      {library.length > 0 && (
        <section>
          <p style={{ marginBottom: 8, marginTop: 0 }}>
            <strong>Adult Consent:</strong> {adultConsent && hasVerifiedAge ? "Granted · Age verified" : "Denied"}
            {" · "}
            <strong>Building Practice:</strong> {wantsPracticeGrowth ? "Granted" : "Denied"}
          </p>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="library-search" style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              Search by name or SKU
            </label>
            <input
              id="library-search"
              type="search"
              placeholder="Search by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                maxWidth: 320,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border, #e5e7eb)"
              }}
            />
          </div>
          <h3>All Audios</h3>
          <div
            role="region"
            aria-label="All audios list"
            tabIndex={0}
            style={{
              maxHeight: 320,
              overflowY: "auto",
              paddingRight: 8,
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: 8
            }}
            className="scroll-list"
          >
            {(searchQuery.trim()
              ? libraryFilteredByAccess.filter(
                  (item) =>
                    (item.title || "").toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
                    (item.skuCode || "").toLowerCase().includes(searchQuery.trim().toLowerCase())
                )
              : libraryFilteredByAccess
            ).map((item) => (
                <Link
                  key={item.id}
                  href={`/library/${item.id}`}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: "10px 12px",
                    textDecoration: "none",
                    color: "inherit",
                    borderBottom: "1px solid var(--border, #e5e7eb)"
                  }}
                >
                  {coverImg(item, 56)}
                  <div style={{ minWidth: 0 }}>
                    <strong>{displayTitle(item)}</strong>
                    <p style={{ color: "#4b5563", margin: "4px 0 0 0", fontSize: 14 }}>
                      {item.description || "Description pending."}
                    </p>
                    {item.isAdult && (
                      <>
                        {" "}
                        <span className="badge">Adult</span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}

      {(interests.some((i) => (grouped.byInterest.get(i.id) || []).length > 0) ||
        grouped.unassigned.length > 0) && (
      <section>
        <h3>By goal</h3>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
          Goals and audios are filtered by your Adult Consent and Building Practice settings. Click a goal to show its audios; click again or another goal to close or switch.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {interests.map((interest) => {
            const items = grouped.byInterest.get(interest.id) || [];
            if (!items.length) return null;
            const isExpanded = expandedGoalId === interest.id;
            return (
              <div key={interest.id}>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedGoalId((prev) => (prev === interest.id ? null : interest.id))
                  }
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: `1px solid ${isExpanded ? "#0f766e" : "#e2e8f0"}`,
                    background: isExpanded ? "rgba(15, 118, 110, 0.08)" : "#fff",
                    color: "#0f172a",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 15
                  }}
                >
                  {interest.name}
                  <span style={{ marginLeft: 8, opacity: 0.8 }}>
                    ({items.length}) {isExpanded ? "▼" : "▶"}
                  </span>
                </button>
                {isExpanded && (
                  <div className="grid grid-3" style={{ marginTop: 12, marginBottom: 8 }}>
                    {items.map(renderCard)}
                  </div>
                )}
              </div>
            );
          })}
          {grouped.unassigned.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() =>
                  setExpandedGoalId((prev) =>
                    prev === "unassigned" ? null : "unassigned"
                  )
                }
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: `1px solid ${expandedGoalId === "unassigned" ? "#0f766e" : "#e2e8f0"}`,
                  background:
                    expandedGoalId === "unassigned"
                      ? "rgba(15, 118, 110, 0.08)"
                      : "#fff",
                  color: "#0f172a",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 15
                }}
              >
                Unassigned
                <span style={{ marginLeft: 8, opacity: 0.8 }}>
                  ({grouped.unassigned.length}){" "}
                  {expandedGoalId === "unassigned" ? "▼" : "▶"}
                </span>
              </button>
              {expandedGoalId === "unassigned" && (
                <div className="grid grid-3" style={{ marginTop: 12, marginBottom: 8 }}>
                  {grouped.unassigned.map(renderCard)}
                </div>
              )}
            </div>
          )}
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
