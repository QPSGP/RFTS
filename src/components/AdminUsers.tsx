"use client";

import { useEffect, useState } from "react";

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
  const [status, setStatus] = useState<string | null>(null);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createTier, setCreateTier] = useState<UserRow["subscriptionTier"]>("bronze");
  const [createStatus, setCreateStatus] =
    useState<UserRow["subscriptionStatus"]>("inactive");
  const [createPlaysPerNight, setCreatePlaysPerNight] = useState<1 | 2>(2);
  const [updates, setUpdates] = useState<Record<string, Partial<UserRow>>>({});
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [profileOpen, setProfileOpen] = useState<Record<string, boolean>>({});
  const [profileDrafts, setProfileDrafts] = useState<Record<string, ProfileDraft>>({});

  const resolveGoalNames = (goalIds: string[]) => {
    return goalIds
      .map((id) => interests.find((goal) => goal.id === id)?.name)
      .filter((name): name is string => !!name);
  };


  const load = async () => {
    const [usersRes, interestsRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/interests")
    ]);
    if (!usersRes.ok || !interestsRes.ok) {
      setStatus("Admin session required.");
      return;
    }
    const usersData = await usersRes.json();
    const interestsData = await interestsRes.json();
    setUsers(usersData.users || []);
    setInterests(interestsData.interests || []);
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
              value={createTier || "bronze"}
              onChange={(event) =>
                setCreateTier(event.target.value as UserRow["subscriptionTier"])
              }
            >
              <option value="bronze">Bronze</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
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
                      "bronze"
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
                    <option value="bronze">Bronze</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
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
                        <div>{resolveGoalNames(user.goalIds).join(", ")}</div>
                      ) : null}
                      <div>Open View Member Profile to edit ordering.</div>
                    </div>
                  )}
                  {profileOpen[user.email] && (
                    <>
                      <label style={{ fontSize: 12 }}>Assigned goals (up to 10)</label>
                      <div className="grid" style={{ gap: 8 }}>
                        {interests.map((interest) => {
                          const orderValue = getGoalOrder(
                            user.email,
                            interest.id,
                            user.goalIds || []
                          );
                          return (
                            <label
                              key={interest.id}
                              className="card"
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
