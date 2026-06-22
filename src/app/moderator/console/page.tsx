"use client";

import { useEffect, useState } from "react";

type AssignedMember = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  subscriptionTier: "platinum" | "platinum_managed" | null;
  subscriptionStatus: string | null;
  registered: boolean;
};

type ModeratorProfile = {
  name: string;
  email: string;
  assignedUserEmails: string[];
  assignedMembers: AssignedMember[];
  status: "active" | "paused";
};

function memberLabel(member: AssignedMember): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  return name || member.email;
}

function tierLabel(tier: AssignedMember["subscriptionTier"]): string {
  if (tier === "platinum_managed") return "Platinum Managed";
  if (tier === "platinum") return "Gold Member";
  return "Unknown tier";
}

export default function ModeratorConsolePage() {
  const [profile, setProfile] = useState<ModeratorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/moderator/me")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => setProfile(data.moderator))
      .catch(() => setError("Facilitator access required."));
  }, []);

  if (error) {
    return (
      <main>
        <section className="card">
          <h1>Facilitator Console</h1>
          <p>{error}</p>
          <p style={{ marginTop: 12 }}>
            Sign in with the access code your admin sent you at{" "}
            <a href="/login">Admin / Facilitator Login</a>.
          </p>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main>
        <section className="card">
          <h1>Facilitator Console</h1>
          <p>Loading your assignments...</p>
        </section>
      </main>
    );
  }

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <main>
      <section
        className="hero"
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <div>
          <span className="pill">Facilitator Console</span>
          <h1>Welcome, {profile.name}</h1>
          <p>
            These are the members assigned to you for managed support. Contact the admin team
            to add or remove assignments, reset your access code, or update a member&apos;s
            rotation.
          </p>
        </div>
        <button className="button button-secondary" type="button" onClick={logout}>
          Log Out
        </button>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Your account</h2>
        <p style={{ margin: 0 }}>
          <strong>Email:</strong> {profile.email}
          <br />
          <strong>Status:</strong> {profile.status === "active" ? "Active" : "Paused"}
        </p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Assigned members</h2>
        {profile.assignedMembers.length === 0 ? (
          <p>
            No members assigned yet. Ask your admin to add member emails when approving your
            application or from Admin → Facilitators Section.
          </p>
        ) : (
          <div className="stack">
            {profile.assignedMembers.map((member) => (
              <div
                key={member.email}
                className="card"
                style={{
                  background: member.registered ? "#f8fafc" : "#fffbeb",
                  border: member.registered ? "1px solid #e2e8f0" : "1px solid #fde68a"
                }}
              >
                <strong>{memberLabel(member)}</strong>
                <p style={{ margin: "6px 0 0", fontSize: 14, color: "#475569" }}>
                  {member.email}
                </p>
                {member.registered ? (
                  <p style={{ margin: "8px 0 0", fontSize: 13 }}>
                    {tierLabel(member.subscriptionTier)} ·{" "}
                    {member.subscriptionStatus ?? "inactive"}
                  </p>
                ) : (
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#92400e" }}>
                    Not registered yet — member has not completed signup.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: 16, background: "#f8fafc" }}>
        <h2 style={{ marginTop: 0 }}>Coming soon</h2>
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
          Member rotation editing, personalized audio uploads, and affiliate earnings will
          appear here in a later release. For now, admins manage Platinum Managed rotations
          and billing in Admin → Members.
        </p>
      </section>
    </main>
  );
}
