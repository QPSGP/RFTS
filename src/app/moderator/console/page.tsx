"use client";

import { useEffect, useState } from "react";

type ModeratorProfile = {
  name: string;
  email: string;
  assignedUserEmails: string[];
  status: "active" | "paused";
};

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
      .catch(() => setError("Collaborator access required."));
  }, []);

  if (error) {
    return (
      <main>
        <section className="card">
          <h1>Collaborator Console</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main>
        <section className="card">
          <h1>Collaborator Console</h1>
          <p>Loading your assignments...</p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="hero" style={{ marginBottom: 24 }}>
        <span className="pill">Collaborator Console</span>
        <h1>Welcome, {profile.name}</h1>
        <p>
          You can only access the subscribers assigned to you. If you need a change,
          contact the admin team.
        </p>
      </section>

      <section className="card">
        <h2>Your Subscribers</h2>
        {profile.assignedUserEmails.length === 0 ? (
          <p>No subscribers assigned yet.</p>
        ) : (
          <div className="stack">
            {profile.assignedUserEmails.map((email) => (
              <p key={email}>{email}</p>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
