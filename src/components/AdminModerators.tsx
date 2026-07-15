"use client";

import { useEffect, useMemo, useState } from "react";
import ModerationQueue from "@/components/ModerationQueue";
import { adminSectionToggleClass } from "@/components/admin-section-toggle";

type FacilitatorAdminSection =
  | "activeFacilitators"
  | "featuredProfiles"
  | "applications"
  | "coCreationQueue"
  | "libraryHygiene";

type FacilitatorLibraryItem = {
  id: string;
  title: string;
  description: string;
  skuCode?: string;
  fileName?: string;
  categories?: string[];
  coverUrl?: string;
  audioUrl?: string;
  interestIds?: string[];
  moderatorId?: string | null;
  inGeneralCatalog?: boolean;
  allowedUserEmails?: string[];
  isAdult?: boolean;
};

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

type ProfileDraft = {
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
};

export default function AdminModerators() {
  const [applications, setApplications] = useState<ModeratorApplication[]>([]);
  const [moderators, setModerators] = useState<ModeratorAccount[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [accessCodes, setAccessCodes] = useState<Record<string, string>>({});
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [resets, setResets] = useState<Record<string, string>>({});
  const [applicationDrafts, setApplicationDrafts] = useState<Record<string, ProfileDraft>>({});
  const [openSection, setOpenSection] = useState<
    Partial<Record<FacilitatorAdminSection, boolean>>
  >({});
  const [libraryItems, setLibraryItems] = useState<FacilitatorLibraryItem[]>([]);
  const [libraryFilter, setLibraryFilter] = useState<
    "facilitator_all" | "facilitator_private" | "in_library"
  >("facilitator_private");
  const [libraryHygieneStatus, setLibraryHygieneStatus] = useState<string | null>(null);

  const facilitatorSectionIsOpen = (section: FacilitatorAdminSection) =>
    !!openSection[section];

  const toggleFacilitatorSection = (section: FacilitatorAdminSection) => {
    const opening = !openSection[section];
    setOpenSection(opening ? { [section]: true } : { ...openSection, [section]: false });
    if (
      opening &&
      (section === "featuredProfiles" || section === "activeFacilitators")
    ) {
      void load();
    }
  };

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

  const pendingApplications = useMemo(
    () => uniqueApplications.filter((app) => app.status !== "approved"),
    [uniqueApplications]
  );

  const approvedApplications = useMemo(
    () => uniqueApplications.filter((app) => app.status === "approved"),
    [uniqueApplications]
  );

  const activeModeratorEmails = useMemo(
    () => new Set(moderators.map((m) => m.email.trim().toLowerCase())),
    [moderators]
  );

  /** Only facilitators with an active login account — matches Active Facilitators list. */
  const featuredFacilitatorProfiles = useMemo(
    () =>
      approvedApplications.filter((app) =>
        activeModeratorEmails.has(app.email.trim().toLowerCase())
      ),
    [approvedApplications, activeModeratorEmails]
  );

  const facilitatorTracks = useMemo(
    () => libraryItems.filter((item) => Boolean(item.moderatorId)),
    [libraryItems]
  );
  const privateTracks = useMemo(
    () => facilitatorTracks.filter((item) => !item.inGeneralCatalog),
    [facilitatorTracks]
  );
  const inLibraryTracks = useMemo(
    () => facilitatorTracks.filter((item) => item.inGeneralCatalog),
    [facilitatorTracks]
  );
  const filteredFacilitatorTracks = useMemo(() => {
    if (libraryFilter === "facilitator_private") return privateTracks;
    if (libraryFilter === "in_library") return inLibraryTracks;
    return facilitatorTracks;
  }, [libraryFilter, facilitatorTracks, privateTracks, inLibraryTracks]);

  const profileDraftFromApplication = (app: ModeratorApplication): ProfileDraft => ({
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
  });

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
        next[app.id] = profileDraftFromApplication(app);
      });
      return next;
    });
  };

  const loadLibraryItems = async () => {
    const response = await fetch("/api/library", { credentials: "include" });
    if (!response.ok) return;
    const data = await response.json();
    setLibraryItems(data.library || []);
  };

  const promotePrivateFacilitatorTracks = async () => {
    if (privateTracks.length === 0) {
      setLibraryHygieneStatus("No facilitator-private tracks to promote.");
      return;
    }
    setLibraryHygieneStatus("Promoting private tracks…");
    let promoted = 0;
    for (const item of privateTracks) {
      const response = await fetch("/api/library", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          title: item.title,
          description: item.description || item.title,
          skuCode: item.skuCode || "",
          fileName: item.fileName || "",
          categories: item.categories || [],
          coverUrl: item.coverUrl || "",
          audioUrl: item.audioUrl || "",
          interestIds: item.interestIds || [],
          allowedUserEmails: item.allowedUserEmails || [],
          isAdult: item.isAdult || false,
          inGeneralCatalog: true
        })
      });
      if (response.ok) promoted += 1;
    }
    await loadLibraryItems();
    setLibraryHygieneStatus(`Promoted ${promoted} of ${privateTracks.length} private track(s).`);
  };

  useEffect(() => {
    load();
    loadLibraryItems();
  }, []);

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
      "Clear all pending and declined applications? Approved facilitators will not be affected."
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

  const deleteFacilitator = async (moderatorId: string, name: string) => {
    const confirmed = window.confirm(
      `Delete facilitator ${name}? This cannot be undone.`
    );
    if (!confirmed) return;
    const response = await fetch("/api/moderator-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-moderator", moderatorId })
    });
    if (response.ok) {
      setStatus("Facilitator deleted.");
      await load();
    } else {
      setStatus("Failed to delete facilitator.");
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
    applicationDrafts[app.id] || profileDraftFromApplication(app);

  const updateApplicationDraft = (appId: string, patch: Partial<ProfileDraft>) => {
    setApplicationDrafts((prev) => {
      const app = applications.find((item) => item.id === appId);
      const base = prev[appId] || (app ? profileDraftFromApplication(app) : null);
      if (!base) return prev;
      return { ...prev, [appId]: { ...base, ...patch } };
    });
  };

  const renderProfileFields = (appId: string, options?: { includeIdentity?: boolean }) => {
    const app = applications.find((item) => item.id === appId);
    if (!app) return null;
    const draft = getApplicationDraft(app);
    const includeIdentity = options?.includeIdentity !== false;
    return (
      <div className="grid">
        {includeIdentity && (
          <>
            <input
              style={inputStyle}
              value={draft.name}
              onChange={(event) => updateApplicationDraft(app.id, { name: event.target.value })}
              placeholder="Full name"
            />
            <input
              style={inputStyle}
              value={draft.email}
              onChange={(event) => updateApplicationDraft(app.id, { email: event.target.value })}
              placeholder="Email"
            />
          </>
        )}
        <input
          style={inputStyle}
          value={draft.profileSlug}
          onChange={(event) =>
            updateApplicationDraft(app.id, { profileSlug: event.target.value })
          }
          placeholder="Profile slug (e.g. terry-brussel-rogers)"
        />
        <input
          style={inputStyle}
          value={draft.focusAreas}
          onChange={(event) =>
            updateApplicationDraft(app.id, { focusAreas: event.target.value })
          }
          placeholder="Focus areas"
        />
        <textarea
          style={{ ...inputStyle, resize: "vertical" }}
          value={draft.experience}
          onChange={(event) =>
            updateApplicationDraft(app.id, { experience: event.target.value })
          }
          placeholder="Experience / bio"
          rows={4}
        />
        <input
          style={inputStyle}
          value={draft.links}
          onChange={(event) => updateApplicationDraft(app.id, { links: event.target.value })}
          placeholder="Portfolio / website"
        />
        <input
          style={inputStyle}
          value={draft.phone}
          onChange={(event) => updateApplicationDraft(app.id, { phone: event.target.value })}
          placeholder="Phone"
        />
        <input
          style={inputStyle}
          value={draft.website}
          onChange={(event) => updateApplicationDraft(app.id, { website: event.target.value })}
          placeholder="Website"
        />
        <input
          style={inputStyle}
          value={draft.socialLinks}
          onChange={(event) =>
            updateApplicationDraft(app.id, { socialLinks: event.target.value })
          }
          placeholder="Social links (comma-separated)"
        />
        <input
          style={inputStyle}
          value={draft.photoUrl}
          onChange={(event) => updateApplicationDraft(app.id, { photoUrl: event.target.value })}
          placeholder="Photo URL"
        />
        {draft.profileSlug.trim() && (
          <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
            Public profile slug: <code>{draft.profileSlug.trim()}</code>
            {" · "}
            <a href={`/facilitators/${draft.profileSlug.trim()}`} target="_blank" rel="noreferrer">
              Preview profile page
            </a>
          </p>
        )}
      </div>
    );
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
      setStatus("Facilitator application updated.");
      await load();
    } else {
      setStatus("Update failed. Check the fields and try again.");
    }
  };

  const saveFacilitatorProfile = async (moderatorId: string, applicationId: string) => {
    const app = applications.find((item) => item.id === applicationId);
    if (!app) return;
    const draft = getApplicationDraft(app);
    const response = await fetch("/api/moderator-admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-facilitator-profile",
        moderatorId,
        applicationId,
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
      setStatus("Facilitator profile saved (public profile + login account synced).");
      await load();
    } else {
      const data = await response.json().catch(() => ({}));
      setStatus(data?.error || "Profile save failed. Check the fields and try again.");
    }
  };

  const ensureFacilitatorProfile = async (moderatorId: string) => {
    const response = await fetch("/api/moderator-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ensure-facilitator-profile", moderatorId })
    });
    if (response.ok) {
      setStatus("Profile record created. You can edit details below.");
      await load();
    } else {
      setStatus("Could not create profile record.");
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
      setStatus("Member assignments saved. Facilitator will see them after refreshing their console.");
      await load();
    } else {
      setStatus("Save failed. Check member emails are valid.");
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
      <h2>Facilitator Admin</h2>
      <p style={{ color: "#4b5563" }}>
        Approve applications, assign members, and manage facilitator profiles and co-creation
        submissions. Open a section below — only one stays open at a time.
      </p>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          type="button"
          className={adminSectionToggleClass(facilitatorSectionIsOpen("libraryHygiene"), true)}
          aria-expanded={facilitatorSectionIsOpen("libraryHygiene")}
          onClick={() => toggleFacilitatorSection("libraryHygiene")}
        >
          Facilitator library — Private / All ({facilitatorTracks.length})
        </button>
        {facilitatorSectionIsOpen("libraryHygiene") && (
          <div className="card" style={{ marginTop: 4 }}>
            <p style={{ marginTop: 0, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
              Review facilitator uploads. <strong>Private</strong> tracks are member-only until you
              promote them to the general library. Same filters also appear in{" "}
              <strong>Audio Library Section</strong>.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <button
                type="button"
                className={adminSectionToggleClass(libraryFilter === "facilitator_private", true)}
                onClick={() => setLibraryFilter("facilitator_private")}
              >
                Private ({privateTracks.length})
              </button>
              <button
                type="button"
                className={adminSectionToggleClass(libraryFilter === "facilitator_all", true)}
                onClick={() => setLibraryFilter("facilitator_all")}
              >
                Facilitator all ({facilitatorTracks.length})
              </button>
              <button
                type="button"
                className={adminSectionToggleClass(libraryFilter === "in_library", true)}
                onClick={() => setLibraryFilter("in_library")}
              >
                In general library ({inLibraryTracks.length})
              </button>
            </div>
            {libraryFilter === "facilitator_private" && privateTracks.length > 0 && (
              <button
                type="button"
                className="button button-secondary"
                style={{ marginBottom: 12 }}
                onClick={() => void promotePrivateFacilitatorTracks()}
              >
                Promote all private tracks to library
              </button>
            )}
            {libraryHygieneStatus && (
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>{libraryHygieneStatus}</p>
            )}
            {filteredFacilitatorTracks.length === 0 ? (
              <p style={{ fontSize: 13, color: "#6b7280" }}>
                No tracks in this view. Facilitators upload from their console under{" "}
                <strong>Member audios</strong>.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {filteredFacilitatorTracks.map((item) => (
                  <li key={item.id} style={{ marginBottom: 8 }}>
                    <strong>{item.skuCode ? `${item.skuCode} – ` : ""}{item.title}</strong>
                    {item.inGeneralCatalog ? (
                      <span style={{ color: "#047857" }}> · in general library</span>
                    ) : (
                      <span style={{ color: "#92400e" }}> · private</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button
          type="button"
          className={adminSectionToggleClass(facilitatorSectionIsOpen("activeFacilitators"), true)}
          aria-expanded={facilitatorSectionIsOpen("activeFacilitators")}
          onClick={() => toggleFacilitatorSection("activeFacilitators")}
        >
          Active Facilitators
        </button>
        {facilitatorSectionIsOpen("activeFacilitators") && (
          <div className="card" style={{ marginTop: 4 }}>
            <div
              className="card"
              style={{
                marginBottom: 16,
                padding: 14,
                background: "#ecfdf5",
                border: "1px solid #a7f3d0"
              }}
            >
              <h3 style={{ marginTop: 0, color: "#065f46" }}>Assign members to a facilitator</h3>
              <ol style={{ margin: "0 0 8px", paddingLeft: 20, color: "#047857", lineHeight: 1.6 }}>
                <li>
                  In each facilitator card below, use the green <strong>Assign members</strong> box.
                </li>
                <li>
                  Enter member emails from <strong>Members Section</strong> (comma-separated).
                </li>
                <li>
                  Click <strong>Save member assignments</strong> — not Save profile (profile is for
                  the public spotlight page only).
                </li>
              </ol>
              <p style={{ margin: 0, fontSize: 13, color: "#065f46" }}>
                Assigned members appear in the facilitator&apos;s console at{" "}
                <code>/moderator/console</code> after they log in at <code>/login</code>.
              </p>
            </div>
            <h3 style={{ marginTop: 0 }}>Active Facilitators — assign members here</h3>
        {moderators.length === 0 ? (
          <p>No facilitators yet. Approve a pending application first.</p>
        ) : (
          <div className="grid">
            {moderators.map((moderator) => {
              const app = findApplicationForEmail(moderator.email);
              const assignedList =
                assignments[moderator.id] ?? moderator.assignedUserEmails.join(", ");
              const assignedCount = assignedList
                .split(",")
                .map((e) => e.trim())
                .filter(Boolean).length;
              return (
                <div key={moderator.id} className="card">
                  <strong>{moderator.name}</strong>
                  <p>{moderator.email}</p>
                  <p>Status: {moderator.status}</p>

                  <div
                    className="card"
                    style={{
                      marginTop: 12,
                      padding: 14,
                      background: "#ecfdf5",
                      border: "1px solid #6ee7b7"
                    }}
                  >
                    <h4 style={{ marginTop: 0, color: "#065f46" }}>
                      Assign members to this facilitator
                    </h4>
                    <p style={{ fontSize: 13, color: "#047857", marginTop: 0 }}>
                      Enter member emails from <strong>Members Section</strong> (comma-separated).
                      Currently assigned: <strong>{assignedCount}</strong>
                      {assignedCount > 0 ? ` — ${assignedList}` : " — none yet"}
                    </p>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                      Member emails
                    </label>
                    <input
                      style={inputStyle}
                      placeholder="e.g. member1@example.com, member2@example.com"
                      value={assignedList}
                      onChange={(event) =>
                        setAssignments({ ...assignments, [moderator.id]: event.target.value })
                      }
                    />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      <button className="button" type="button" onClick={() => updateModerator(moderator.id)}>
                        Save member assignments
                      </button>
                    </div>
                  </div>

                  <div className="card" style={{ marginTop: 12 }}>
                    <h4 style={{ marginTop: 0 }}>Account access</h4>
                    <input
                      style={inputStyle}
                      placeholder="Reset access code (optional, 6+ chars)"
                      value={resets[moderator.id] || ""}
                      onChange={(event) =>
                        setResets({ ...resets, [moderator.id]: event.target.value })
                      }
                    />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => updateModerator(moderator.id)}
                      >
                        Save access code
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
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
                        type="button"
                        onClick={() => deleteFacilitator(moderator.id, moderator.name)}
                        style={{ color: "#b91c1c" }}
                      >
                        Delete Facilitator
                      </button>
                    </div>
                  </div>

                  <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                    <h4 style={{ marginTop: 0 }}>Public profile &amp; login identity</h4>
                    <p style={{ fontSize: 13, color: "#475569", marginTop: 0 }}>
                      Spotlight page fields — separate from member assignments above.
                    </p>
                    {app ? (
                      <>
                        {renderProfileFields(app.id)}
                        <button
                          className="button button-secondary"
                          type="button"
                          style={{ marginTop: 12 }}
                          onClick={() => saveFacilitatorProfile(moderator.id, app.id)}
                        >
                          Save profile
                        </button>
                      </>
                    ) : (
                      <>
                        <p style={{ color: "#6b7280" }}>
                          No profile record linked to this facilitator yet.
                        </p>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => ensureFacilitatorProfile(moderator.id)}
                        >
                          Create profile record
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </div>
        )}

        <button
          type="button"
          className={adminSectionToggleClass(facilitatorSectionIsOpen("featuredProfiles"), true)}
          aria-expanded={facilitatorSectionIsOpen("featuredProfiles")}
          onClick={() => toggleFacilitatorSection("featuredProfiles")}
        >
          Featured Facilitator Profiles
        </button>
        {facilitatorSectionIsOpen("featuredProfiles") && (
          <div className="card" style={{ marginTop: 4 }}>
        <h3 style={{ marginTop: 0 }}>Featured Facilitator Profiles</h3>
        <p style={{ color: "#4b5563" }}>
          Spotlight pages use the profile slug below. Only active facilitators appear here (same
          as <strong>Active Facilitators</strong>). Edit profiles in Active Facilitators — save
          updates the public page and login account together.
        </p>
        <div className="grid">
          {featuredFacilitatorProfiles.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No active facilitator profiles yet.</p>
          ) : (
            featuredFacilitatorProfiles.map((app) => {
              const draft = getApplicationDraft(app);
              const slug = draft.profileSlug.trim();
              return (
                <div key={app.id} className="card">
                  <strong>{draft.name || app.name}</strong>
                  <p style={{ fontSize: 13, color: "#6b7280" }}>
                    {slug ? `Slug: ${slug}` : "No profile slug set yet"}
                  </p>
                  {slug ? (
                    <a
                      className="button button-secondary"
                      href={`/facilitators/${slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Profile
                    </a>
                  ) : (
                    <p style={{ fontSize: 13, color: "#92400e" }}>
                      Set a profile slug in Active Facilitators to enable a public page.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
          </div>
        )}

        <button
          type="button"
          className={adminSectionToggleClass(facilitatorSectionIsOpen("applications"), true)}
          aria-expanded={facilitatorSectionIsOpen("applications")}
          onClick={() => toggleFacilitatorSection("applications")}
        >
          Facilitator Applications
        </button>
        {facilitatorSectionIsOpen("applications") && (
          <div className="card" style={{ marginTop: 4 }}>
        <h3 style={{ marginTop: 0 }}>Facilitator Applications (pending / declined)</h3>
        <p style={{ color: "#6b7280" }}>
          When approving a new facilitator, you can assign member emails here too — or assign later
          in <strong>Active Facilitators</strong>.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={clearPendingApplications}
          >
            Clear Pending Applications
          </button>
          <button type="button" className="button" onClick={seedDemoApplication}>
            Create Demo Application
          </button>
        </div>
          {pendingApplications.length === 0 ? (
            <p>No pending or declined applications.</p>
          ) : (
            <div className="grid">
              {pendingApplications.map((app) => (
                  <div key={app.id} className="card">
                    <strong>{app.name}</strong>
                    <p>Status: {app.status}</p>
                    {renderProfileFields(app.id)}
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
                          placeholder="Assigned member emails (comma-separated, e.g. ciesar4@gmail.com)"
                          value={assignments[app.id] || ""}
                          onChange={(event) =>
                            setAssignments({ ...assignments, [app.id]: event.target.value })
                          }
                        />
                      </>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
        )}

        <button
          type="button"
          className={adminSectionToggleClass(facilitatorSectionIsOpen("coCreationQueue"), true)}
          aria-expanded={facilitatorSectionIsOpen("coCreationQueue")}
          onClick={() => toggleFacilitatorSection("coCreationQueue")}
        >
          Co-Creation Queue
        </button>
        {facilitatorSectionIsOpen("coCreationQueue") && (
          <div style={{ marginTop: 4 }}>
            <ModerationQueue />
          </div>
        )}
      </div>

      {status && <p style={{ marginTop: 16 }}>{status}</p>}
    </div>
  );
}
