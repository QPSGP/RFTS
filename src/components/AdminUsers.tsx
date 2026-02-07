"use client";

import { useEffect, useMemo, useState } from "react";
import type { LibraryItem } from "@/lib/types";

type Interest = {
  id: string;
  name: string;
};

type UserRow = {
  id: string;
  email: string;
  goalIds: string[];
  subscriptionStatus: "inactive" | "active" | "past_due" | "canceled" | null;
  subscriptionTier: "bronze" | "gold" | "platinum" | null;
  playsPerNight: number;
};

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

const timeZones = [
  "Pacific Time",
  "Mountain Time",
  "Central Time",
  "Eastern Time",
  "Alaska Time",
  "Hawaii Time",
  "Other"
];

type ProfileDraft = {
  firstName: string;
  lastName: string;
  gender: string;
  yearBorn: string;
  contactNumber: string;
  bestContactTimes: string;
  timeZone: string;
  occupation: string;
  incomeGoal: string;
  incomeGoalYear: string;
  incomeGoalRelation: string;
  isFirstResponder: boolean;
  wantsPracticeGrowth: boolean;
  adultConsent: boolean;
  wantsPolyamory: boolean;
  hadLgdSession: boolean;
  referralSource: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createTier, setCreateTier] = useState<UserRow["subscriptionTier"]>("platinum");
  const [createStatus, setCreateStatus] =
    useState<UserRow["subscriptionStatus"]>("inactive");
  const [createPlaysPerNight, setCreatePlaysPerNight] = useState<1 | 2>(2);
  const [updates, setUpdates] = useState<Record<string, Partial<UserRow>>>({});
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [profileOpen, setProfileOpen] = useState<Record<string, boolean>>({});
  const [profileDrafts, setProfileDrafts] = useState<Record<string, ProfileDraft>>({});
  const [audioAssignments, setAudioAssignments] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [audioSaveStatus, setAudioSaveStatus] = useState<Record<string, string>>({});
  const [newAudioDrafts, setNewAudioDrafts] = useState<
    Record<
      string,
      {
        title: string;
        description: string;
        audioUrl: string;
        coverUrl: string;
        skuCode: string;
        categories: string;
      }
    >
  >({});

  const sortedInterests = useMemo(
    () => interests.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [interests]
  );

  const resolveGoalNames = (goalIds: string[]) => {
    return goalIds
      .map((id) => interests.find((goal) => goal.id === id)?.name)
      .filter((name): name is string => !!name);
  };


  const load = async () => {
    const [usersRes, interestsRes, libraryRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/interests"),
      fetch("/api/library")
    ]);
    if (!usersRes.ok || !interestsRes.ok || !libraryRes.ok) {
      setStatus("Admin session required.");
      return;
    }
    const usersData = await usersRes.json();
    const interestsData = await interestsRes.json();
    const libraryData = await libraryRes.json();
    setUsers(usersData.users || []);
    setInterests(interestsData.interests || []);
    setLibrary(libraryData.library || []);
  };

  useEffect(() => {
    load();
  }, []);

  const createUser = async () => {
    setStatus(null);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: createEmail,
        password: createPassword,
        tier: createTier,
        status: createStatus,
        playsPerNight: createPlaysPerNight
      })
    });
    if (response.ok) {
      setStatus("User created.");
      setCreateEmail("");
      setCreatePassword("");
      setCreatePlaysPerNight(2);
      await load();
      return;
    }
    const data = await response.json().catch(() => ({}));
    setStatus(
      data?.error ||
        `Create failed. Email may already exist. (status ${response.status})`
    );
  };

  const deleteUser = async (email: string) => {
    if (!window.confirm(`Delete member ${email}? This cannot be undone.`)) {
      return;
    }
    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    if (response.ok) {
      setStatus("Member deleted.");
      await load();
      return;
    }
    const data = await response.json().catch(() => ({}));
    setStatus(data?.error || `Delete failed.`);
  };

  const updateUser = async (email: string) => {
    const update = updates[email];
    if (!update) {
      return;
    }
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        tier: update.subscriptionTier,
        status: update.subscriptionStatus,
        goalIds: update.goalIds,
        playsPerNight: update.playsPerNight,
        resetPassword: resetPasswords[email]
      })
    });
    if (response.ok) {
      setStatus("User updated.");
      setResetPasswords((prev) => ({ ...prev, [email]: "" }));
      await load();
      return;
    }
    const data = await response.json().catch(() => ({}));
    setStatus(data?.error || `Update failed. (status ${response.status})`);
  };

  const loadProfile = async (email: string) => {
    const response = await fetch(`/api/admin/member-profile?email=${encodeURIComponent(email)}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data?.error || `Unable to load profile. (status ${response.status})`);
      return;
    }
    const data = await response.json();
    const profile = data.profile || {};
    setProfileDrafts((prev) => ({
      ...prev,
      [email]: {
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        gender: profile.gender || "",
        yearBorn: profile.yearBorn ? String(profile.yearBorn) : "",
        contactNumber: profile.contactNumber || "",
        bestContactTimes: profile.bestContactTimes || "",
        timeZone: profile.timeZone || "Pacific Time",
        occupation: profile.occupation || "",
        incomeGoal: profile.incomeGoal || "",
        incomeGoalYear: profile.incomeGoalYear ? String(profile.incomeGoalYear) : "",
        incomeGoalRelation: profile.incomeGoalRelation || "",
        isFirstResponder: !!profile.isFirstResponder,
        wantsPracticeGrowth: !!profile.wantsPracticeGrowth,
        adultConsent: !!profile.adultConsent,
        wantsPolyamory: !!profile.wantsPolyamory,
        hadLgdSession: !!profile.hadLgdSession,
        referralSource: profile.referralSource || ""
      }
    }));
  };

  const buildAudioAssignment = (email: string) => {
    const emailLower = email.toLowerCase();
    return library.reduce<Record<string, boolean>>((acc, item) => {
      acc[item.id] =
        item.allowedUserEmails?.some((allowed) => allowed.toLowerCase() === emailLower) ||
        false;
      return acc;
    }, {});
  };

  const toggleAudioAssignment = (email: string, itemId: string) => {
    setAudioAssignments((prev) => ({
      ...prev,
      [email]: {
        ...(prev[email] || {}),
        [itemId]: !(prev[email]?.[itemId] ?? false)
      }
    }));
  };

  const saveAudioAssignments = async (email: string) => {
    const current = audioAssignments[email] || buildAudioAssignment(email);
    const emailLower = email.toLowerCase();
    const updates = library.filter((item) => {
      const shouldHave = !!current[item.id];
      const hasEmail =
        item.allowedUserEmails?.some((allowed) => allowed.toLowerCase() === emailLower) ||
        false;
      return shouldHave !== hasEmail;
    });
    if (updates.length === 0) {
      setAudioSaveStatus((prev) => ({ ...prev, [email]: "No changes to save." }));
      return;
    }
    await Promise.all(
      updates.map((item) => {
        const allowed = item.allowedUserEmails || [];
        const shouldHave = !!current[item.id];
        const nextAllowed = shouldHave
          ? Array.from(new Set([...allowed, email]))
          : allowed.filter((allowedEmail) => allowedEmail.toLowerCase() !== emailLower);
        return fetch("/api/library", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            title: item.title,
            description: item.description,
            skuCode: item.skuCode || "",
            categories: item.categories || [],
            coverUrl: item.coverUrl || "",
            audioUrl: item.audioUrl || "",
            interestIds: item.interestIds || [],
            allowedUserEmails: nextAllowed,
            isAdult: item.isAdult || false
          })
        });
      })
    );
    setAudioSaveStatus((prev) => ({
      ...prev,
      [email]: `Saved ${updates.length} personalized audio update(s).`
    }));
    await load();
  };

  const getAudioDraft = (email: string) =>
    newAudioDrafts[email] || {
      title: "",
      description: "",
      audioUrl: "",
      coverUrl: "",
      skuCode: "",
      categories: "CGMR"
    };

  const updateAudioDraft = (email: string, patch: Partial<(typeof newAudioDrafts)[string]>) => {
    setNewAudioDrafts((prev) => ({
      ...prev,
      [email]: {
        ...getAudioDraft(email),
        ...patch
      }
    }));
  };

  const addPersonalizedAudio = async (email: string) => {
    const draft = getAudioDraft(email);
    if (!draft.title.trim() || !draft.description.trim() || !draft.audioUrl.trim()) {
      setAudioSaveStatus((prev) => ({
        ...prev,
        [email]: "Add a title, description, and audio URL."
      }));
      return;
    }
    const categories = draft.categories
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const response = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title,
        description: draft.description,
        skuCode: draft.skuCode,
        categories,
        coverUrl: draft.coverUrl,
        audioUrl: draft.audioUrl,
        interestIds: [],
        allowedUserEmails: [email]
      })
    });
    if (!response.ok) {
      setAudioSaveStatus((prev) => ({
        ...prev,
        [email]: "Unable to add audio. Check the fields and try again."
      }));
      return;
    }
    setAudioSaveStatus((prev) => ({
      ...prev,
      [email]: "Personalized audio added."
    }));
    setNewAudioDrafts((prev) => ({
      ...prev,
      [email]: {
        title: "",
        description: "",
        audioUrl: "",
        coverUrl: "",
        skuCode: "",
        categories: "CGMR"
      }
    }));
    await load();
  };

  const saveProfile = async (email: string) => {
    const draft = profileDrafts[email];
    if (!draft) {
      return;
    }
    const response = await fetch("/api/admin/member-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        profile: {
          firstName: draft.firstName,
          lastName: draft.lastName,
          gender: draft.gender,
          yearBorn: draft.yearBorn ? Number(draft.yearBorn) : undefined,
          contactNumber: draft.contactNumber,
          bestContactTimes: draft.bestContactTimes,
          timeZone: draft.timeZone,
          occupation: draft.occupation,
          incomeGoal: draft.incomeGoal,
          incomeGoalYear: draft.incomeGoalYear ? Number(draft.incomeGoalYear) : undefined,
          incomeGoalRelation: draft.incomeGoalRelation,
          isFirstResponder: draft.isFirstResponder,
          wantsPracticeGrowth: draft.wantsPracticeGrowth,
          adultConsent: draft.adultConsent,
          wantsPolyamory: draft.wantsPolyamory,
          hadLgdSession: draft.hadLgdSession,
          referralSource: draft.referralSource
        }
      })
    });
    if (response.ok) {
      setStatus("Member profile saved.");
      setProfileOpen((prev) => ({ ...prev, [email]: false }));
      return;
    }
    const data = await response.json().catch(() => ({}));
    setStatus(data?.error || `Profile save failed. (status ${response.status})`);
  };

  const getDerivedAudios = (goalIds: string[]) => {
    if (!goalIds || goalIds.length === 0) {
      return [];
    }
    return library.filter((item) => item.interestIds?.some((id) => goalIds.includes(id)));
  };

  const updateOrderedGoals = (email: string, goalId: string, orderValue: string) => {
    const parsed = Number(orderValue);
    if (!orderValue || Number.isNaN(parsed) || parsed <= 0) {
      setUpdates((prev) => {
        const current = prev[email]?.goalIds || [];
        return {
          ...prev,
          [email]: {
            ...prev[email],
            goalIds: current.filter((id) => id !== goalId)
          }
        };
      });
      return;
    }
    setUpdates((prev) => {
      const current = prev[email]?.goalIds || [];
      const without = current.filter((id) => id !== goalId);
      const next = [...without];
      next.splice(Math.min(parsed - 1, next.length), 0, goalId);
      return {
        ...prev,
        [email]: {
          ...prev[email],
          goalIds: next
        }
      };
    });
  };

  const getGoalOrder = (email: string, goalId: string, fallback: string[]) => {
    const list = updates[email]?.goalIds || fallback;
    const index = list.indexOf(goalId);
    return index === -1 ? "" : String(index + 1);
  };

  return (
    <div className="card">
      <h2>Member Accounts</h2>
      <p style={{ color: "#4b5563" }}>
        Create member accounts, assign tiers, and activate subscriptions.
      </p>
      {status && <p>{status}</p>}
      <div className="grid" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Create Member</h3>
          <div className="grid">
            <input
              style={inputStyle}
              value={createEmail}
              onChange={(event) => setCreateEmail(event.target.value)}
              placeholder="Email"
            />
            <input
              style={inputStyle}
              value={createPassword}
              onChange={(event) => setCreatePassword(event.target.value)}
              placeholder="Temporary password"
              type="password"
            />
            <select
              style={inputStyle}
              value={createTier || "platinum"}
              onChange={(event) =>
                setCreateTier(event.target.value as UserRow["subscriptionTier"])
              }
            >
              <option value="platinum">RFTS Membership Package</option>
            </select>
            <select
              style={inputStyle}
              value={createStatus || "inactive"}
              onChange={(event) =>
                setCreateStatus(
                  event.target.value as UserRow["subscriptionStatus"]
                )
              }
            >
              <option value="inactive">Inactive</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
            </select>
            <select
              style={inputStyle}
              value={createPlaysPerNight}
              onChange={(event) =>
                setCreatePlaysPerNight(Number(event.target.value) as 1 | 2)
              }
            >
              <option value={2}>2 sessions per night (default)</option>
              <option value={1}>1 session per night</option>
            </select>
            <button className="button" onClick={createUser}>
              Create Member
            </button>
          </div>
        </div>

        <div className="card">
          <h3>Existing Members</h3>
          {users.length === 0 ? (
            <p>No member accounts yet.</p>
          ) : (
            <div className="grid">
              {users.map((user) => (
                <div key={user.id} className="card">
                  <strong>{user.email}</strong>
                  <p>Goals: {user.goalIds?.length || 0}</p>
                  <select
                    style={inputStyle}
                    value={
                      updates[user.email]?.subscriptionTier ||
                      user.subscriptionTier ||
                      "platinum"
                    }
                    onChange={(event) =>
                      setUpdates({
                        ...updates,
                        [user.email]: {
                          ...updates[user.email],
                          subscriptionTier: event.target
                            .value as UserRow["subscriptionTier"]
                        }
                      })
                    }
                  >
                    <option value="platinum">RFTS Membership Package</option>
                  </select>
                  <select
                    style={inputStyle}
                    value={
                      updates[user.email]?.subscriptionStatus ||
                      user.subscriptionStatus ||
                      "inactive"
                    }
                    onChange={(event) =>
                      setUpdates({
                        ...updates,
                        [user.email]: {
                          ...updates[user.email],
                          subscriptionStatus: event.target
                            .value as UserRow["subscriptionStatus"]
                        }
                      })
                    }
                  >
                    <option value="inactive">Inactive</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past Due</option>
                    <option value="canceled">Canceled</option>
                  </select>
                  <select
                    style={inputStyle}
                    value={updates[user.email]?.playsPerNight || user.playsPerNight || 2}
                    onChange={(event) =>
                      setUpdates({
                        ...updates,
                        [user.email]: {
                          ...updates[user.email],
                          playsPerNight: Number(event.target.value) as 1 | 2
                        }
                      })
                    }
                  >
                    <option value={2}>2 sessions per night</option>
                    <option value={1}>1 session per night</option>
                  </select>
                  <input
                    style={inputStyle}
                    placeholder="Reset password (optional)"
                    type="password"
                    value={resetPasswords[user.email] || ""}
                    onChange={(event) =>
                      setResetPasswords({
                        ...resetPasswords,
                        [user.email]: event.target.value
                      })
                    }
                  />
                  {!profileOpen[user.email] && (
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      <div>Goals assigned: {user.goalIds?.length || 0}</div>
                      {user.goalIds?.length ? (
                        <div>{resolveGoalNames(user.goalIds).sort().join(", ")}</div>
                      ) : null}
                      <div>Open View Member Profile to edit ordering.</div>
                    </div>
                  )}
                  {profileOpen[user.email] && (
                    <>
                      <label style={{ fontSize: 12 }}>Assigned goals (up to 10)</label>
                      <div className="goal-list">
                        {sortedInterests.map((interest) => {
                          const orderValue = getGoalOrder(
                            user.email,
                            interest.id,
                            user.goalIds || []
                          );
                          return (
                            <label
                              key={interest.id}
                              className="goal-item"
                              style={{ display: "flex", gap: 8, alignItems: "center" }}
                            >
                              <input
                                type="checkbox"
                                checked={orderValue !== ""}
                                onChange={(event) =>
                                  updateOrderedGoals(
                                    user.email,
                                    interest.id,
                                    event.target.checked ? "1" : ""
                                  )
                                }
                              />
                              <span style={{ flex: 1 }}>{interest.name}</span>
                              <input
                                value={orderValue}
                                onChange={(event) =>
                                  updateOrderedGoals(
                                    user.email,
                                    interest.id,
                                    event.target.value
                                  )
                                }
                                placeholder="#"
                                style={{
                                  width: 44,
                                  textAlign: "center",
                                  borderRadius: 6,
                                  border: "1px solid #d1d5db",
                                  padding: "4px 6px",
                                  background: orderValue ? "#16a34a" : "#ffffff",
                                  color: orderValue ? "#ffffff" : "#111827",
                                  fontWeight: 600
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <label style={{ fontSize: 12 }}>Audios from goals (read-only)</label>
                        <p style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                          These are automatically included based on the member's goal
                          selections.
                        </p>
                        <div className="goal-list">
                          {getDerivedAudios(user.goalIds || []).length === 0 ? (
                            <span style={{ color: "#6b7280", fontSize: 12 }}>
                              No goal-based audios assigned yet.
                            </span>
                          ) : (
                            getDerivedAudios(user.goalIds || []).map((item) => (
                              <div
                                key={item.id}
                                className="goal-item"
                                style={{ display: "flex", gap: 8, alignItems: "center" }}
                              >
                                <span style={{ flex: 1 }}>
                                  {item.skuCode ? `${item.skuCode} - ` : ""}
                                  {item.title}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <label style={{ fontSize: 12 }}>Personalized audio (CGMR)</label>
                        <p style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                          Assign custom audios for this member. These audios will only be
                          available to the selected user.
                        </p>
                        <div className="grid" style={{ gap: 8, marginBottom: 12 }}>
                          <input
                            style={inputStyle}
                            placeholder="CGMR title"
                            value={getAudioDraft(user.email).title}
                            onChange={(event) =>
                              updateAudioDraft(user.email, { title: event.target.value })
                            }
                          />
                          <input
                            style={inputStyle}
                            placeholder="CGMR description"
                            value={getAudioDraft(user.email).description}
                            onChange={(event) =>
                              updateAudioDraft(user.email, { description: event.target.value })
                            }
                          />
                          <input
                            style={inputStyle}
                            placeholder="Audio URL (required)"
                            value={getAudioDraft(user.email).audioUrl}
                            onChange={(event) =>
                              updateAudioDraft(user.email, { audioUrl: event.target.value })
                            }
                          />
                          <input
                            style={inputStyle}
                            placeholder="Cover URL (optional)"
                            value={getAudioDraft(user.email).coverUrl}
                            onChange={(event) =>
                              updateAudioDraft(user.email, { coverUrl: event.target.value })
                            }
                          />
                          <input
                            style={inputStyle}
                            placeholder="SKU (optional)"
                            value={getAudioDraft(user.email).skuCode}
                            onChange={(event) =>
                              updateAudioDraft(user.email, { skuCode: event.target.value })
                            }
                          />
                          <input
                            style={inputStyle}
                            placeholder="Categories (comma-separated)"
                            value={getAudioDraft(user.email).categories}
                            onChange={(event) =>
                              updateAudioDraft(user.email, { categories: event.target.value })
                            }
                          />
                          <button
                            className="button button-secondary"
                            type="button"
                            onClick={() => addPersonalizedAudio(user.email)}
                          >
                            Add Personalized Audio
                          </button>
                        </div>
                        <div className="goal-list">
                          {library.map((item) => (
                            <label
                              key={item.id}
                              className="goal-item"
                              style={{ display: "flex", gap: 8, alignItems: "center" }}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  audioAssignments[user.email]?.[item.id] ??
                                  item.allowedUserEmails?.some(
                                    (allowed) =>
                                      allowed.toLowerCase() === user.email.toLowerCase()
                                  ) ??
                                  false
                                }
                                onChange={() => toggleAudioAssignment(user.email, item.id)}
                              />
                              <span style={{ flex: 1 }}>
                                {item.skuCode ? `${item.skuCode} - ` : ""}
                                {item.title}
                              </span>
                            </label>
                          ))}
                        </div>
                        <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
                          <button
                            className="button button-secondary"
                            type="button"
                            onClick={() => saveAudioAssignments(user.email)}
                          >
                            Save Personalized Audios
                          </button>
                          {audioSaveStatus[user.email] && (
                            <span style={{ alignSelf: "center" }}>
                              {audioSaveStatus[user.email]}
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={async () => {
                      const next = !profileOpen[user.email];
                      setProfileOpen({ ...profileOpen, [user.email]: next });
                      if (next && !profileDrafts[user.email]) {
                        await loadProfile(user.email);
                      }
                    }}
                  >
                    {profileOpen[user.email] ? "Hide Member Profile" : "View Member Profile"}
                  </button>
                  {profileOpen[user.email] && profileDrafts[user.email] && (
                    <div className="card" style={{ marginTop: 12 }}>
                      <h4>Member Profile</h4>
                      <div className="grid grid-2">
                        <input
                          style={inputStyle}
                          placeholder="First Name"
                          value={profileDrafts[user.email].firstName}
                          onChange={(event) =>
                            setProfileDrafts({
                              ...profileDrafts,
                              [user.email]: {
                                ...profileDrafts[user.email],
                                firstName: event.target.value
                              }
                            })
                          }
                        />
                        <input
                          style={inputStyle}
                          placeholder="Last Name"
                          value={profileDrafts[user.email].lastName}
                          onChange={(event) =>
                            setProfileDrafts({
                              ...profileDrafts,
                              [user.email]: {
                                ...profileDrafts[user.email],
                                lastName: event.target.value
                              }
                            })
                          }
                        />
                        <input
                          style={inputStyle}
                          placeholder="Gender"
                          value={profileDrafts[user.email].gender}
                          onChange={(event) =>
                            setProfileDrafts({
                              ...profileDrafts,
                              [user.email]: {
                                ...profileDrafts[user.email],
                                gender: event.target.value
                              }
                            })
                          }
                        />
                        <input
                          style={inputStyle}
                          placeholder="Year born"
                          value={profileDrafts[user.email].yearBorn}
                          onChange={(event) =>
                            setProfileDrafts({
                              ...profileDrafts,
                              [user.email]: {
                                ...profileDrafts[user.email],
                                yearBorn: event.target.value
                              }
                            })
                          }
                        />
                        <input
                          style={inputStyle}
                          placeholder="Best Contact Number"
                          value={profileDrafts[user.email].contactNumber}
                          onChange={(event) =>
                            setProfileDrafts({
                              ...profileDrafts,
                              [user.email]: {
                                ...profileDrafts[user.email],
                                contactNumber: event.target.value
                              }
                            })
                          }
                        />
                        <input
                          style={inputStyle}
                          placeholder="Best Time(s) Reached"
                          value={profileDrafts[user.email].bestContactTimes}
                          onChange={(event) =>
                            setProfileDrafts({
                              ...profileDrafts,
                              [user.email]: {
                                ...profileDrafts[user.email],
                                bestContactTimes: event.target.value
                              }
                            })
                          }
                        />
                        <select
                          style={inputStyle}
                          value={profileDrafts[user.email].timeZone}
                          onChange={(event) =>
                            setProfileDrafts({
                              ...profileDrafts,
                              [user.email]: {
                                ...profileDrafts[user.email],
                                timeZone: event.target.value
                              }
                            })
                          }
                        >
                          {timeZones.map((zone) => (
                            <option key={zone} value={zone}>
                              {zone}
                            </option>
                          ))}
                        </select>
                        <input
                          style={inputStyle}
                          placeholder="Occupation"
                          value={profileDrafts[user.email].occupation}
                          onChange={(event) =>
                            setProfileDrafts({
                              ...profileDrafts,
                              [user.email]: {
                                ...profileDrafts[user.email],
                                occupation: event.target.value
                              }
                            })
                          }
                        />
                        <input
                          style={inputStyle}
                          placeholder="Annual income goal"
                          value={profileDrafts[user.email].incomeGoal}
                          onChange={(event) =>
                            setProfileDrafts({
                              ...profileDrafts,
                              [user.email]: {
                                ...profileDrafts[user.email],
                                incomeGoal: event.target.value
                              }
                            })
                          }
                        />
                        <input
                          style={inputStyle}
                          placeholder="Goal year"
                          value={profileDrafts[user.email].incomeGoalYear}
                          onChange={(event) =>
                            setProfileDrafts({
                              ...profileDrafts,
                              [user.email]: {
                                ...profileDrafts[user.email],
                                incomeGoalYear: event.target.value
                              }
                            })
                          }
                        />
                        <input
                          style={inputStyle}
                          placeholder="Goal vs current income"
                          value={profileDrafts[user.email].incomeGoalRelation}
                          onChange={(event) =>
                            setProfileDrafts({
                              ...profileDrafts,
                              [user.email]: {
                                ...profileDrafts[user.email],
                                incomeGoalRelation: event.target.value
                              }
                            })
                          }
                        />
                        <label className="card" style={{ cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={profileDrafts[user.email].isFirstResponder}
                            onChange={(event) =>
                              setProfileDrafts({
                                ...profileDrafts,
                                [user.email]: {
                                  ...profileDrafts[user.email],
                                  isFirstResponder: event.target.checked
                                }
                              })
                            }
                            style={{ marginRight: 8 }}
                          />
                          First responder / healthcare
                        </label>
                        <label className="card" style={{ cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={profileDrafts[user.email].wantsPracticeGrowth}
                            onChange={(event) =>
                              setProfileDrafts({
                                ...profileDrafts,
                                [user.email]: {
                                  ...profileDrafts[user.email],
                                  wantsPracticeGrowth: event.target.checked
                                }
                              })
                            }
                            style={{ marginRight: 8 }}
                          />
                          Build private practice
                        </label>
                        <label className="card" style={{ cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={profileDrafts[user.email].adultConsent}
                            onChange={(event) =>
                              setProfileDrafts({
                                ...profileDrafts,
                                [user.email]: {
                                  ...profileDrafts[user.email],
                                  adultConsent: event.target.checked
                                }
                              })
                            }
                            style={{ marginRight: 8 }}
                          />
                          Adult content consent
                        </label>
                        <label className="card" style={{ cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={profileDrafts[user.email].wantsPolyamory}
                            onChange={(event) =>
                              setProfileDrafts({
                                ...profileDrafts,
                                [user.email]: {
                                  ...profileDrafts[user.email],
                                  wantsPolyamory: event.target.checked
                                }
                              })
                            }
                            style={{ marginRight: 8 }}
                          />
                          Interested in polyamory audios
                        </label>
                        <label className="card" style={{ cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={profileDrafts[user.email].hadLgdSession}
                            onChange={(event) =>
                              setProfileDrafts({
                                ...profileDrafts,
                                [user.email]: {
                                  ...profileDrafts[user.email],
                                  hadLgdSession: event.target.checked
                                }
                              })
                            }
                            style={{ marginRight: 8 }}
                          />
                          Life Guidance Discovery Session
                        </label>
                        <input
                          style={inputStyle}
                          placeholder="Referral source"
                          value={profileDrafts[user.email].referralSource}
                          onChange={(event) =>
                            setProfileDrafts({
                              ...profileDrafts,
                              [user.email]: {
                                ...profileDrafts[user.email],
                                referralSource: event.target.value
                              }
                            })
                          }
                        />
                      </div>
                      <button
                        className="button"
                        type="button"
                        style={{ marginTop: 12 }}
                        onClick={() => saveProfile(user.email)}
                      >
                        Save Profile
                      </button>
                    </div>
                  )}
                  <button className="button" onClick={() => updateUser(user.email)}>
                    Save
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => deleteUser(user.email)}
                    style={{ color: "#b91c1c" }}
                  >
                    Delete Member
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
