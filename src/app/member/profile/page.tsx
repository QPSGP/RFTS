"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MemberBillingSection, {
  type MemberBillingInfo
} from "@/components/MemberBillingSection";
import MemberAffiliateSection, {
  type MemberAffiliateInfo
} from "@/components/MemberAffiliateSection";

const TIME_ZONES = [
  "Pacific Time",
  "Mountain Time",
  "Central Time",
  "Eastern Time",
  "Alaska Time",
  "Hawaii Time",
  "Other"
];

const inputStyle = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%",
  boxSizing: "border-box" as const
};

type ProfileState = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  /** Full birth date YYYY-MM-DD for calendar; used with yearBorn for age. */
  birthDate: string;
  yearBorn: string;
  contactNumber: string | null;
  bestContactTimes: string | null;
  timeZone: string;
  occupation: string | null;
  wantsPracticeGrowth: boolean;
  adultConsent: boolean;
  wantsPolyamory: boolean;
  wantsLgdInfo: boolean;
  hadLgdSession: boolean;
  referralSource: string | null;
};

const emptyProfile: ProfileState = {
  email: "",
  firstName: null,
  lastName: null,
  gender: null,
  birthDate: "",
  yearBorn: "",
  contactNumber: null,
  bestContactTimes: null,
  timeZone: "Pacific Time",
  occupation: null,
  wantsPracticeGrowth: false,
  adultConsent: false,
  wantsPolyamory: false,
  wantsLgdInfo: false,
  hadLgdSession: false,
  referralSource: null
};

function toState(profile: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  yearBorn?: number | null;
  birthDate?: string | null;
  contactNumber?: string | null;
  bestContactTimes?: string | null;
  timeZone?: string | null;
  occupation?: string | null;
  wantsPracticeGrowth?: boolean;
  adultConsent?: boolean;
  wantsPolyamory?: boolean;
  wantsLgdInfo?: boolean;
  hadLgdSession?: boolean;
  referralSource?: string | null;
}): ProfileState {
  const birthDate = profile.birthDate?.trim() || "";
  const yearBorn =
    profile.yearBorn != null && !Number.isNaN(profile.yearBorn)
      ? String(profile.yearBorn)
      : "";
  return {
    email: profile.email ?? "",
    firstName: profile.firstName ?? null,
    lastName: profile.lastName ?? null,
    gender: profile.gender ?? null,
    birthDate: birthDate || (yearBorn ? `${yearBorn}-01-01` : ""),
    yearBorn,
    contactNumber: profile.contactNumber ?? null,
    bestContactTimes: profile.bestContactTimes ?? null,
    timeZone: profile.timeZone ?? "Pacific Time",
    occupation: profile.occupation ?? null,
    wantsPracticeGrowth: profile.wantsPracticeGrowth ?? false,
    adultConsent: profile.adultConsent ?? false,
    wantsPolyamory: profile.wantsPolyamory ?? false,
    wantsLgdInfo: profile.wantsLgdInfo ?? false,
    hadLgdSession: profile.hadLgdSession ?? false,
    referralSource: profile.referralSource ?? null
  };
}

export default function MemberProfilePage() {
  const [status, setStatus] = useState<"loading" | "ready" | "loggedOut">("loading");
  const [profile, setProfile] = useState<ProfileState>(emptyProfile);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [billing, setBilling] = useState<MemberBillingInfo | null>(null);
  const [affiliate, setAffiliate] = useState<MemberAffiliateInfo | null>(null);
  const [facilitator, setFacilitator] = useState<{ name: string; email: string } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const profileSummaryName = useMemo(() => {
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
    return name || profile.email || "Member";
  }, [profile.firstName, profile.lastName, profile.email]);

  const showAdultContent = useMemo(() => {
    const dateStr = profile.birthDate.trim() || (profile.yearBorn.trim() ? `${profile.yearBorn}-01-01` : "");
    if (!dateStr) return false;
    const yearNum = parseInt(dateStr.slice(0, 4), 10);
    if (Number.isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) return false;
    return new Date().getFullYear() - yearNum >= 18;
  }, [profile.birthDate, profile.yearBorn]);

  const load = useCallback(async () => {
    const res = await fetch("/api/member/profile", { credentials: "include" });
    if (res.status === 401) {
      setStatus("loggedOut");
      return;
    }
    if (!res.ok) {
      setStatus("ready");
      setProfile(emptyProfile);
      return;
    }
    const data = await res.json();
    setProfile(toState(data.profile ?? {}));
    setBilling(data.billing ?? null);
    setAffiliate(data.affiliate ?? null);
    setFacilitator(data.facilitator ?? null);
    setStatus("ready");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (status === "loggedOut" && typeof window !== "undefined") {
      window.location.replace("/member/login");
    }
  }, [status]);

  const save = async () => {
    setSaveMessage(null);
    setSaving(true);
    const birthDate =
      typeof profile.birthDate === "string" && profile.birthDate.trim()
        ? profile.birthDate.trim().slice(0, 10)
        : undefined;
    const res = await fetch("/api/member/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        firstName: profile.firstName?.trim() || undefined,
        lastName: profile.lastName?.trim() || undefined,
        gender: profile.gender?.trim() || undefined,
        birthDate,
        contactNumber: profile.contactNumber?.trim() || undefined,
        bestContactTimes: profile.bestContactTimes?.trim() || undefined,
        timeZone: profile.timeZone || undefined,
        occupation: profile.occupation?.trim() || undefined,
        wantsPracticeGrowth: profile.wantsPracticeGrowth,
        adultConsent: profile.adultConsent,
        wantsPolyamory: profile.wantsPolyamory,
        wantsLgdInfo: profile.wantsLgdInfo,
        hadLgdSession: profile.hadLgdSession,
        referralSource: profile.referralSource?.trim() || undefined
      })
    });
    setSaving(false);
    if (res.ok) {
      setSaveMessage("Profile saved.");
      load();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setSaveMessage(data?.error || "Save failed.");
  };

  if (status === "loading") {
    return (
      <main className="section">
        <p style={{ color: "#64748b" }}>Loading your profile…</p>
      </main>
    );
  }

  if (status === "loggedOut") {
    return null;
  }

  return (
    <main className="section">
      <div className="card" style={{ maxWidth: 720, margin: "0 auto" }}>
        <p style={{ marginTop: 0, marginBottom: 16 }}>
          <Link href="/play-options" className="button button-secondary">
            Back to Play Options
          </Link>
        </p>
        <h1>My Profile</h1>
        <p style={{ color: "#4b5563", marginTop: 4 }}>
          Manage billing, affiliate sharing, and personal details below.
        </p>

        <section
          style={{
            marginTop: 24,
            padding: 20,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#fafafa"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap"
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>Personal details</h2>
              {!profileOpen && (
                <p style={{ margin: "6px 0 0", fontSize: 14, color: "#4b5563" }}>
                  {profileSummaryName}
                  {profile.email ? ` · ${profile.email}` : ""}
                </p>
              )}
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setProfileOpen((open) => !open)}
            >
              {profileOpen ? "Close Profile" : "Open Profile"}
            </button>
          </div>

          {profileOpen && (
            <>
              <p style={{ color: "#4b5563", fontSize: 14, margin: "16px 0 12px" }}>
                Before selecting your goals we need some basic information to start your
                customization and better service you.
              </p>

              <div className="grid grid-2">
          <input
            style={inputStyle}
            placeholder="First Name *"
            value={profile.firstName ?? ""}
            onChange={(e) =>
              setProfile((p) => ({ ...p, firstName: e.target.value || null }))
            }
          />
          <input
            style={inputStyle}
            placeholder="Last Name *"
            value={profile.lastName ?? ""}
            onChange={(e) =>
              setProfile((p) => ({ ...p, lastName: e.target.value || null }))
            }
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 4 }}>
              Email (cannot be changed here)
            </p>
            <input
              style={{ ...inputStyle, backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
              readOnly
              value={profile.email}
              aria-label="Email"
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 4 }}>
              Birthdate (optional). Required for mature content access 18+.
            </p>
            <input
              type="date"
              style={inputStyle}
              value={profile.birthDate}
              onChange={(e) => {
                const v = e.target.value;
                setProfile((p) => ({
                  ...p,
                  birthDate: v,
                  yearBorn: v ? v.slice(0, 4) : ""
                }));
              }}
            />
          </div>
          <div>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 4 }}>
              Helps with customization.
            </p>
            <input
              style={inputStyle}
              placeholder="Gender (optional)"
              value={profile.gender ?? ""}
              onChange={(e) =>
                setProfile((p) => ({ ...p, gender: e.target.value || null }))
              }
            />
          </div>
          <input
            style={inputStyle}
            placeholder="Occupation (optional)"
            value={profile.occupation ?? ""}
            onChange={(e) =>
              setProfile((p) => ({ ...p, occupation: e.target.value || null }))
            }
          />
          <input
            style={inputStyle}
            placeholder="Best Contact Number (optional)"
            value={profile.contactNumber ?? ""}
            onChange={(e) =>
              setProfile((p) => ({ ...p, contactNumber: e.target.value || null }))
            }
          />
          <input
            style={inputStyle}
            placeholder="Best Time(s) Reached (optional)"
            value={profile.bestContactTimes ?? ""}
            onChange={(e) =>
              setProfile((p) => ({ ...p, bestContactTimes: e.target.value || null }))
            }
          />
          <select
            style={inputStyle}
            value={profile.timeZone}
            onChange={(e) => setProfile((p) => ({ ...p, timeZone: e.target.value }))}
          >
            {TIME_ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>

        <div className="grid" style={{ marginTop: 16 }}>
          <label
            className="card"
            style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}
          >
            <input
              type="checkbox"
              checked={profile.wantsLgdInfo}
              onChange={(e) =>
                setProfile((p) => ({ ...p, wantsLgdInfo: e.target.checked }))
              }
              style={{ marginTop: 3, flex: "0 0 auto", width: 18, minWidth: 18, height: 18 }}
            />
            <span>
              I am interested in more information on a &quot;Life Guidance Discovery Session&quot; to receive a
              customized &quot;Goal Manifestation&quot; audio specific for me!
            </span>
          </label>
          <label
            className="card"
            style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}
          >
            <input
              type="checkbox"
              checked={profile.hadLgdSession}
              onChange={(e) =>
                setProfile((p) => ({ ...p, hadLgdSession: e.target.checked }))
              }
              style={{ marginTop: 3, flex: "0 0 auto", width: 18, minWidth: 18, height: 18 }}
            />
            <span>I have already had a Life Guidance Discovery Session.</span>
          </label>
          {showAdultContent && (
            <div className="card">
              <p style={{ marginTop: 0, marginBottom: 12, fontWeight: 600 }}>
                Adult content
              </p>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                You are 18 or older. You may opt in to audios with mature content below.
              </p>
              <label
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  marginBottom: 12
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.adultConsent}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, adultConsent: e.target.checked }))
                  }
                  style={{ marginTop: 3, flex: "0 0 auto", width: 18, minWidth: 18, height: 18 }}
                />
                <span>I consent to hear audios with mature content.</span>
              </label>
              <div
                style={{
                  marginLeft: 28,
                  paddingLeft: 12,
                  borderLeft: "2px solid #e5e7eb"
                }}
              >
                <label
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10
                  }}
                >
                  <input
                    type="checkbox"
                    checked={profile.wantsPolyamory}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, wantsPolyamory: e.target.checked }))
                    }
                    style={{ marginTop: 3, flex: "0 0 auto", width: 18, minWidth: 18, height: 18 }}
                  />
                  <span>I would like to hear audios related to polyamory.</span>
                </label>
              </div>
            </div>
          )}
          <label
            className="card"
            style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}
          >
            <input
              type="checkbox"
              checked={profile.wantsPracticeGrowth}
              onChange={(e) =>
                setProfile((p) => ({ ...p, wantsPracticeGrowth: e.target.checked }))
              }
              style={{ marginTop: 3, flex: "0 0 auto", width: 18, minWidth: 18, height: 18 }}
            />
            <span>
              I am interested in building my practice as a Hypnotherapist, Healer, or Life/Business Coach using the
              tools offered here.
            </span>
          </label>
          <input
            style={inputStyle}
            placeholder="How did you find us?"
            value={profile.referralSource ?? ""}
            onChange={(e) =>
              setProfile((p) => ({ ...p, referralSource: e.target.value || null }))
            }
          />
        </div>

        <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            className="button"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Profile"}
          </button>
          {saveMessage && (
            <span style={{ fontSize: 14, color: saveMessage === "Profile saved." ? "#059669" : "#dc2626" }}>
              {saveMessage}
            </span>
          )}
        </div>
            </>
          )}
        </section>

        {facilitator && (
          <section
            style={{
              marginTop: 24,
              padding: 20,
              borderRadius: 12,
              border: "1px solid #d1fae5",
              background: "#ecfdf5"
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>Your facilitator</h2>
            <p style={{ margin: 0, color: "#047857", lineHeight: 1.5 }}>
              <strong>{facilitator.name}</strong> is assigned to support your membership.
              {facilitator.email ? (
                <>
                  {" "}
                  Contact:{" "}
                  <a href={`mailto:${facilitator.email}`} style={{ color: "#065f46" }}>
                    {facilitator.email}
                  </a>
                </>
              ) : null}
            </p>
          </section>
        )}

        <MemberBillingSection billing={billing} returnPath="/member/profile" />

        <MemberAffiliateSection affiliate={affiliate} onPayoutSaved={load} />

        <p style={{ marginTop: 24, marginBottom: 0 }}>
          <Link href="/play-options" className="button button-secondary">
            Back to Play Options
          </Link>
        </p>
      </div>
    </main>
  );
}
