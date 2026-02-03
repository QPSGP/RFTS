"use client";

import { useEffect, useState } from "react";

type ModeratorApplication = {
  id: string;
  name: string;
  email: string;
  focusAreas: string;
  experience: string;
  links?: string;
  submittedAt: string;
  status: "pending" | "approved" | "declined";
};

type ModeratorAccount = {
  id: string;
  name: string;
  email: string;
  assignedUserEmails: string[];
  status: "active" | "paused";
  createdAt: string;
};

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

export default function AdminModerators() {
  const [applications, setApplications] = useState<ModeratorApplication[]>([]);
  const [moderators, setModerators] = useState<ModeratorAccount[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [accessCodes, setAccessCodes] = useState<Record<string, string>>({});
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [resets, setResets] = useState<Record<string, string>>({});

  const load = async () => {
    const response = await fetch("/api/moderator-admin");
    if (!response.ok) {
      setStatus("Admin session required.");
      return;
    }
    const data = await response.json();
    setApplications(data.applications || []);
    setModerators(data.moderators || []);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (applicationId: string) => {
    const rawEmails = assignments[applicationId] || "";
    const assignedUserEmails = rawEmails
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    const response = await fetch("/api/moderator-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId,
        accessCode: accessCodes[applicationId] || "",
        assignedUserEmails
      })
    });
    if (response.ok) {
      setStatus("Moderator approved.");
      await load();
      return;
    }
    setStatus("Approval failed. Add a 6+ character access code.");
  };

  const decline = async (applicationId: string) => {
    const response = await fetch("/api/moderator-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decline", applicationId })
    });
    if (response.ok) {
      setStatus("Application declined.");
      await load();
    }
  };

  const updateModerator = async (moderatorId: string) => {
    const rawEmails = assignments[moderatorId] || "";
    const assignedUserEmails = rawEmails
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    const response = await fetch("/api/moderator-admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moderatorId,
        assignedUserEmails,
        resetAccessCode: resets[moderatorId] || undefined
      })
    });
    if (response.ok) {
      setStatus("Moderator updated.");
      await load();
    }
  };

  const toggleStatus = async (moderatorId: string, status: "active" | "paused") => {
    const response = await fetch("/api/moderator-admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moderatorId, status })
    });
    if (response.ok) {
      await load();
    }
  };

  return (
    <div className="card">
      <h2>Co-Creator Admin</h2>
      <p style={{ color: "#4b5563" }}>
        Co-Creators can only access their assigned subscribers. They cannot add
        admins or other co-creators.
      </p>
      {status && <p>{status}</p>}
      <div className="grid" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Co-Creator Applications</h3>
          {applications.filter((app) => app.status === "pending").length === 0 ? (
            <p>No pending applications.</p>
          ) : (
            <div className="grid">
              {applications
                .filter((app) => app.status === "pending")
                .map((app) => (
                  <div key={app.id} className="card">
                    <strong>{app.name}</strong>
                    <p>{app.email}</p>
                    <p>Focus: {app.focusAreas}</p>
                    <p>Experience: {app.experience}</p>
                    {app.links && <p>Links: {app.links}</p>}
                    <input
                      style={inputStyle}
                      placeholder="Temporary access code (6+ chars)"
                      value={accessCodes[app.id] || ""}
                      onChange={(event) =>
                        setAccessCodes({ ...accessCodes, [app.id]: event.target.value })
                      }
                    />
                    <input
                      style={inputStyle}
                      placeholder="Assigned subscriber emails (comma-separated)"
                      value={assignments[app.id] || ""}
                      onChange={(event) =>
                        setAssignments({ ...assignments, [app.id]: event.target.value })
                      }
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="button" onClick={() => approve(app.id)}>
                        Approve
                      </button>
                      <button
                        className="button button-secondary"
                        onClick={() => decline(app.id)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Active Co-Creators</h3>
          {moderators.length === 0 ? (
            <p>No co-creators yet.</p>
          ) : (
            <div className="grid">
              {moderators.map((moderator) => (
                <div key={moderator.id} className="card">
                  <strong>{moderator.name}</strong>
                  <p>{moderator.email}</p>
                  <p>Status: {moderator.status}</p>
                  <input
                    style={inputStyle}
                    placeholder="Assigned subscriber emails"
                    value={
                      assignments[moderator.id] ??
                      moderator.assignedUserEmails.join(", ")
                    }
                    onChange={(event) =>
                      setAssignments({ ...assignments, [moderator.id]: event.target.value })
                    }
                  />
                  <input
                    style={inputStyle}
                    placeholder="Reset access code (optional)"
                    value={resets[moderator.id] || ""}
                    onChange={(event) =>
                      setResets({ ...resets, [moderator.id]: event.target.value })
                    }
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="button" onClick={() => updateModerator(moderator.id)}>
                      Save
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={() =>
                        toggleStatus(
                          moderator.id,
                          moderator.status === "active" ? "paused" : "active"
                        )
                      }
                    >
                      {moderator.status === "active" ? "Pause" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
