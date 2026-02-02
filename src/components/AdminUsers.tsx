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
                  <label style={{ fontSize: 12 }}>Assigned goals (up to 10)</label>
                  <select
                    multiple
                    style={inputStyle}
                    value={updates[user.email]?.goalIds || user.goalIds || []}
                    onChange={(event) =>
                      setUpdates({
                        ...updates,
                        [user.email]: {
                          ...updates[user.email],
                          goalIds: Array.from(
                            event.target.selectedOptions,
                            (option) => option.value
                          )
                        }
                      })
                    }
                  >
                    {interests.map((interest) => (
                      <option key={interest.id} value={interest.id}>
                        {interest.name}
                      </option>
                    ))}
                  </select>
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
