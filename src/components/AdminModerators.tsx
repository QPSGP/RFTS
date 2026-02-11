"use client";

import { useEffect, useMemo, useState } from "react";

type ModeratorApplication = {
  id: string;
  name: string;
  email: string;
  focusAreas: string;
  experience: string;
  links?: string;
  phone?: string;
  website?: string;
  socialLinks?: string;
  photoUrl?: string;
  profileSlug?: string;
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
  const [applicationDrafts, setApplicationDrafts] = useState<
    Record<
      string,
      {
        name: string;
        email: string;
        focusAreas: string;
        experience: string;
        links: string;
        phone: string;
        website: string;
        socialLinks: string;
        photoUrl: string;
        profileSlug: string;
      }
    >
  >({});

  const uniqueApplications = useMemo(() => {
    const map = new Map<string, ModeratorApplication>();
    applications.forEach((app) => {
      const key = app.email.toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, app);
        return;
      }
      const currentTime = new Date(app.submittedAt).getTime();
      const existingTime = new Date(existing.submittedAt).getTime();
      if (currentTime > existingTime) {
        map.set(key, app);
      }
    });
    return Array.from(map.values());
  }, [applications]);

  const load = async () => {
    const response = await fetch("/api/moderator-admin");
    if (!response.ok) {
      setStatus("Admin session required.");
      return;
    }
    const data = await response.json();
    setApplications(data.applications || []);
    setModerators(data.moderators || []);
    setApplicationDrafts((prev) => {
      const next = { ...prev };
      (data.applications || []).forEach((app: ModeratorApplication) => {
        if (!next[app.id]) {
          next[app.id] = {
            name: app.name,
            email: app.email,
            focusAreas: app.focusAreas,
            experience: app.experience,
            links: app.links || "",
            phone: app.phone || "",
            website: app.website || "",
            socialLinks: app.socialLinks || "",
            photoUrl: app.photoUrl || "",
            profileSlug: app.profileSlug || ""
          };
        }
      });
      return next;
    });
  };

  useEffect(() => {
    load();
  }, []);

  const resetDemoData = async () => {
    const confirmed = window.confirm(
      "Clear all co-creator applications and accounts?"
    );
    if (!confirmed) {
      return;
    }
    const response = await fetch("/api/moderator-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-demo" })
    });
    if (response.ok) {
      setStatus("Co-Creator data cleared.");
      await load();
      return;
    }
    setStatus("Reset failed. Try again.");
  };

  const seedDemoApplication = async () => {
    const response = await fetch("/api/moderator-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed-demo" })
    });
    if (response.ok) {
      setStatus("Demo application created. You can approve it now.");
      await load();
      return;
    }
    setStatus("Seed failed. Try again.");
  };

  const clearPendingApplications = async () => {
    const confirmed = window.confirm(
      "Clear all pending and declined applications? Approved co-creators will not be affected."
    );
    if (!confirmed) return;
    const response = await fetch("/api/moderator-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear-pending-applications" })
    });
    if (response.ok) {
      setStatus("Pending applications cleared.");
      await load();
    } else {
      setStatus("Failed to clear pending applications.");
    }
  };

  const deleteCoCreator = async (moderatorId: string, name: string) => {
    const confirmed = window.confirm(
      `Delete co-creator ${name}? This cannot be undone.`
    );
    if (!confirmed) return;
    const response = await fetch("/api/moderator-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-moderator", moderatorId })
    });
    if (response.ok) {
      setStatus("Co-Creator deleted.");
      await load();
    } else {
      setStatus("Failed to delete co-creator.");
    }
  };

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

  const getApplicationDraft = (app: ModeratorApplication) =>
    applicationDrafts[app.id] || {
      name: app.name,
      email: app.email,
      focusAreas: app.focusAreas,
      experience: app.experience,
      links: app.links || "",
      phone: app.phone || "",
      website: app.website || "",
      socialLinks: app.socialLinks || "",
      photoUrl: app.photoUrl || "",
      profileSlug: app.profileSlug || ""
    };

  const updateApplicationDraft = (
    appId: string,
    patch: Partial<(typeof applicationDrafts)[string]>
  ) => {
    setApplicationDrafts((prev) => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        ...patch
      }
    }));
  };

  const saveApplication = async (appId: string) => {
    const app = applications.find((item) => item.id === appId);
    if (!app) {
      return;
    }
    const draft = getApplicationDraft(app);
    const response = await fetch("/api/moderator-admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-application",
        applicationId: appId,
        name: draft.name,
        email: draft.email,
        focusAreas: draft.focusAreas,
        experience: draft.experience,
        links: draft.links,
        phone: draft.phone,
        website: draft.website,
        socialLinks: draft.socialLinks,
        photoUrl: draft.photoUrl,
        profileSlug: draft.profileSlug
      })
    });
    if (response.ok) {
      setStatus("Co-Creator application updated.");
      await load();
    } else {
      setStatus("Update failed. Check the fields and try again.");
    }
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

  const findApplicationForEmail = (email: string) =>
    uniqueApplications.find((app) => app.email.toLowerCase() === email.toLowerCase());

  return (
    <div className="card">
      <h2>Co-Creator Admin</h2>
      <p style={{ color: "#4b5563" }}>
        Co-Creators can only access their assigned subscribers. They cannot add
        admins or other co-creators. Clear Pending Applications removes only
        applications not yet approved; approved co-creators stay unless deleted.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button className="button button-secondary" onClick={resetDemoData}>
          Clear All Co-Creator Data
        </button>
        <button
          className="button button-secondary"
          onClick={clearPendingApplications}
        >
          Clear Pending Applications
        </button>
        <button className="button" onClick={seedDemoApplication}>
          Create Demo Application
        </button>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Featured Co-Creator Profiles</h3>
        <p style={{ color: "#4b5563" }}>
          Manage spotlight pages for your co-creators.
        </p>
        <div className="grid">
          <div className="card">
            <strong>Terry Brussel-Rogers, CCHt</strong>
            <p>Co-Creator profile page</p>
            <a
              className="button button-secondary"
              href="/co-creators/terry-brussel-rogers"
            >
              View Profile
            </a>
          </div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Active Co-Creators (Summary)</h3>
        {moderators.length === 0 ? (
          <p>No co-creators yet. Approve a pending application to activate.</p>
        ) : (
          <div className="stack">
            {moderators.map((moderator) => (
              <p key={moderator.id}>
                {moderator.name} — {moderator.email}
              </p>
            ))}
          </div>
        )}
      </div>
      {status && <p>{status}</p>}
      <div className="grid" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Co-Creator Applications</h3>
          <p style={{ color: "#6b7280" }}>
            Applications appear here after someone submits the Co-Creator form.
            Approve buttons show only while the status is pending. Use "Clear Pending
            Applications" above to remove only pending/declined applications; approved
            co-creators stay in the system unless you delete them.
          </p>
          {uniqueApplications.length === 0 ? (
            <p>No applications yet.</p>
          ) : (
            <div className="grid">
              {uniqueApplications.map((app) => (
                  <div key={app.id} className="card">
                    <strong>{app.name}</strong>
                    <p>Status: {app.status}</p>
                    <div className="grid" style={{ marginTop: 8 }}>
                      <input
                        style={inputStyle}
                        value={getApplicationDraft(app).name}
                        onChange={(event) =>
                          updateApplicationDraft(app.id, { name: event.target.value })
                        }
                        placeholder="Full name"
                      />
                      <input
                        style={inputStyle}
                        value={getApplicationDraft(app).email}
                        onChange={(event) =>
                          updateApplicationDraft(app.id, { email: event.target.value })
                        }
                        placeholder="Email"
                      />
                      <input
                        style={inputStyle}
                        value={getApplicationDraft(app).profileSlug}
                        onChange={(event) =>
                          updateApplicationDraft(app.id, { profileSlug: event.target.value })
                        }
                        placeholder="Profile slug (e.g. terry-brussel-rogers)"
                      />
                      <input
                        style={inputStyle}
                        value={getApplicationDraft(app).focusAreas}
                        onChange={(event) =>
                          updateApplicationDraft(app.id, { focusAreas: event.target.value })
                        }
                        placeholder="Focus areas"
                      />
                      <textarea
                        style={{ ...inputStyle, resize: "vertical" }}
                        value={getApplicationDraft(app).experience}
                        onChange={(event) =>
                          updateApplicationDraft(app.id, { experience: event.target.value })
                        }
                        placeholder="Experience"
                        rows={4}
                      />
                      <input
                        style={inputStyle}
                        value={getApplicationDraft(app).links}
                        onChange={(event) =>
                          updateApplicationDraft(app.id, { links: event.target.value })
                        }
                        placeholder="Portfolio / website"
                      />
                      <input
                        style={inputStyle}
                        value={getApplicationDraft(app).phone}
                        onChange={(event) =>
                          updateApplicationDraft(app.id, { phone: event.target.value })
                        }
                        placeholder="Phone"
                      />
                      <input
                        style={inputStyle}
                        value={getApplicationDraft(app).website}
                        onChange={(event) =>
                          updateApplicationDraft(app.id, { website: event.target.value })
                        }
                        placeholder="Website"
                      />
                      <input
                        style={inputStyle}
                        value={getApplicationDraft(app).socialLinks}
                        onChange={(event) =>
                          updateApplicationDraft(app.id, { socialLinks: event.target.value })
                        }
                        placeholder="Social links (comma-separated)"
                      />
                      <input
                        style={inputStyle}
                        value={getApplicationDraft(app).photoUrl}
                        onChange={(event) =>
                          updateApplicationDraft(app.id, { photoUrl: event.target.value })
                        }
                        placeholder="Photo URL"
                      />
                    </div>
                    {app.status === "pending" && (
                      <>
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
                      </>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => saveApplication(app.id)}
                      >
                        Save Profile
                      </button>
                      {app.status === "pending" && (
                        <>
                          <button className="button" onClick={() => approve(app.id)}>
                            Approve
                          </button>
                          <button
                            className="button button-secondary"
                            onClick={() => decline(app.id)}
                          >
                            Decline
                          </button>
                        </>
                      )}
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
                  <div className="card" style={{ marginTop: 12 }}>
                    <h4 style={{ marginTop: 0 }}>Profile Details</h4>
                    {findApplicationForEmail(moderator.email) ? (
                      <div className="grid">
                        {(() => {
                          const app = findApplicationForEmail(moderator.email);
                          if (!app) return null;
                          const draft = getApplicationDraft(app);
                          return (
                            <>
                              <input
                                style={inputStyle}
                                value={draft.focusAreas}
                                onChange={(event) =>
                                  updateApplicationDraft(app.id, {
                                    focusAreas: event.target.value
                                  })
                                }
                                placeholder="Focus areas"
                              />
                              <textarea
                                style={{ ...inputStyle, resize: "vertical" }}
                                value={draft.experience}
                                onChange={(event) =>
                                  updateApplicationDraft(app.id, {
                                    experience: event.target.value
                                  })
                                }
                                placeholder="Experience"
                                rows={4}
                              />
                              <input
                                style={inputStyle}
                                value={draft.links}
                                onChange={(event) =>
                                  updateApplicationDraft(app.id, {
                                    links: event.target.value
                                  })
                                }
                                placeholder="Portfolio / website"
                              />
                              <input
                                style={inputStyle}
                                value={draft.phone}
                                onChange={(event) =>
                                  updateApplicationDraft(app.id, {
                                    phone: event.target.value
                                  })
                                }
                                placeholder="Phone"
                              />
                              <input
                                style={inputStyle}
                                value={draft.website}
                                onChange={(event) =>
                                  updateApplicationDraft(app.id, {
                                    website: event.target.value
                                  })
                                }
                                placeholder="Website"
                              />
                              <input
                                style={inputStyle}
                                value={draft.socialLinks}
                                onChange={(event) =>
                                  updateApplicationDraft(app.id, {
                                    socialLinks: event.target.value
                                  })
                                }
                                placeholder="Social links (comma-separated)"
                              />
                              <input
                                style={inputStyle}
                                value={draft.photoUrl}
                                onChange={(event) =>
                                  updateApplicationDraft(app.id, {
                                    photoUrl: event.target.value
                                  })
                                }
                                placeholder="Photo URL"
                              />
                              <input
                                style={inputStyle}
                                value={draft.profileSlug}
                                onChange={(event) =>
                                  updateApplicationDraft(app.id, {
                                    profileSlug: event.target.value
                                  })
                                }
                                placeholder="Profile slug (e.g. terry-brussel-rogers)"
                              />
                              <button
                                className="button button-secondary"
                                type="button"
                                onClick={() => saveApplication(app.id)}
                              >
                                Save Profile
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <p style={{ color: "#6b7280" }}>
                        No application profile found for this co-creator yet.
                        Create one in the Co-Creator Applications section to enable
                        profile editing.
                      </p>
                    )}
                  </div>
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
                      {moderator.status === "active" ? "Make Inactive" : "Make Active"}
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={() => deleteCoCreator(moderator.id, moderator.name)}
                      style={{ color: "#b91c1c" }}
                    >
                      Delete Co-Creator
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
