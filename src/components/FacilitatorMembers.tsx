"use client";

import { put } from "@vercel/blob/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminSectionToggleClass } from "@/components/admin-section-toggle";
import { MANAGED_MAX_SLOTS_PER_AUDIO } from "@/lib/managed-rotation-limits";

function sanitizePathSegment(name: string): string {
  return name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200) || "audio";
}

type FacilitatorAudioRow = {
  id: string;
  title: string;
  description: string;
  skuCode: string;
  allowedUserEmails: string[];
  inGeneralCatalog: boolean;
  createdAt: string;
};

type MemberRow = {
  email: string;
  registered: boolean;
  firstName: string | null;
  lastName: string | null;
  subscriptionTier: "platinum" | "platinum_managed" | null;
  subscriptionStatus: string | null;
  goalIds: string[];
  playsPerNight: number;
};

type MemberProfileDetail = {
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  yearBorn?: number | null;
  contactNumber?: string | null;
  timeZone?: string | null;
  occupation?: string | null;
  notes?: string | null;
};

type ActivityRow = {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
};

type LibraryItem = {
  id: string;
  title: string;
  skuCode: string;
};

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

function memberLabel(member: MemberRow): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  return name || member.email;
}

function tierLabel(tier: MemberRow["subscriptionTier"]): string {
  if (tier === "platinum_managed") return "Platinum Managed";
  if (tier === "platinum") return "Gold Member";
  return "Unknown tier";
}

function countInOrder(order: string[], itemId: string): number {
  return order.filter((id) => id === itemId).length;
}

export default function FacilitatorMembers() {
  const [facilitatorName, setFacilitatorName] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [profileDetail, setProfileDetail] = useState<{
    subscriptionTier: MemberRow["subscriptionTier"];
    subscriptionStatus: string | null;
    goalIds: string[];
    playsPerNight: number;
    profile: MemberProfileDetail | null;
    registered: boolean;
  } | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [scheduleProgress, setScheduleProgress] = useState<{
    completedScheduleNights: number;
    currentNight: number;
    scheduleStartedAt: string | null;
  } | null>(null);
  const [rotationOrder, setRotationOrder] = useState<string[]>([]);
  const [rotationLoading, setRotationLoading] = useState(false);
  const [rotationSaveStatus, setRotationSaveStatus] = useState<string | null>(null);
  const [pickerId, setPickerId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [memberAudiosOpen, setMemberAudiosOpen] = useState(false);
  const [facilitatorAudios, setFacilitatorAudios] = useState<FacilitatorAudioRow[]>([]);
  const [audioDraft, setAudioDraft] = useState({
    title: "",
    description: "",
    audioUrl: "",
    coverUrl: "",
    skuCode: ""
  });
  const [audioMemberPick, setAudioMemberPick] = useState<Record<string, boolean>>({});
  const [audioUploadStatus, setAudioUploadStatus] = useState<string | null>(null);
  const [audioSaveStatus, setAudioSaveStatus] = useState<string | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [newMemberFirstName, setNewMemberFirstName] = useState("");
  const [newMemberLastName, setNewMemberLastName] = useState("");
  const [newMemberTier, setNewMemberTier] = useState<"platinum" | "platinum_managed">("platinum");
  const [newMemberStatus, setNewMemberStatus] = useState<"inactive" | "active">("inactive");
  const [newMemberSaveStatus, setNewMemberSaveStatus] = useState<string | null>(null);

  const selectedMember = useMemo(
    () => members.find((m) => m.email === selectedEmail) ?? null,
    [members, selectedEmail]
  );

  const isManaged =
    profileDetail?.subscriptionTier === "platinum_managed" ||
    selectedMember?.subscriptionTier === "platinum_managed";

  const loadMembers = useCallback(async () => {
    const meRes = await fetch("/api/moderator/me");
    if (!meRes.ok) throw new Error("Unauthorized");
    const meData = await meRes.json();
    setFacilitatorName(meData.moderator?.name ?? "");

    const membersRes = await fetch("/api/moderator/members");
    if (!membersRes.ok) throw new Error("Could not load members");
    const membersData = await membersRes.json();
    setMembers(membersData.members ?? []);

    const libRes = await fetch("/api/moderator/library");
    if (libRes.ok) {
      const libData = await libRes.json();
      setLibrary(libData.library ?? []);
    }
  }, []);

  const loadFacilitatorAudios = useCallback(async () => {
    const res = await fetch("/api/moderator/facilitator-audios");
    if (!res.ok) return;
    const data = await res.json();
    setFacilitatorAudios(data.audios ?? []);
  }, []);

  useEffect(() => {
    if (memberAudiosOpen) void loadFacilitatorAudios();
  }, [memberAudiosOpen, loadFacilitatorAudios]);

  useEffect(() => {
    if (members.length === 0) return;
    setAudioMemberPick((prev) => {
      const next = { ...prev };
      for (const m of members) {
        if (next[m.email] === undefined) next[m.email] = true;
      }
      return next;
    });
  }, [members]);

  const loadMemberDetail = useCallback(async (email: string, memberTier: MemberRow["subscriptionTier"]) => {
    setDetailLoading(true);
    setProfileDetail(null);
    setActivity([]);
    setScheduleProgress(null);
    setRotationOrder([]);
    setRotationSaveStatus(null);
    try {
      let tier = memberTier;
      const profileRes = await fetch(
        `/api/moderator/members/profile?email=${encodeURIComponent(email)}`
      );
      if (profileRes.ok) {
        const data = await profileRes.json();
        tier = data.member?.subscriptionTier ?? tier;
        setProfileDetail({
          subscriptionTier: data.member?.subscriptionTier ?? null,
          subscriptionStatus: data.member?.subscriptionStatus ?? null,
          goalIds: data.member?.goalIds ?? [],
          playsPerNight: data.member?.playsPerNight ?? 2,
          profile: data.member?.profile ?? null,
          registered: data.member?.registered ?? true
        });
      }

      const activityRes = await fetch(
        `/api/moderator/members/activity?email=${encodeURIComponent(email)}&limit=80`
      );
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.activityLog ?? []);
        setScheduleProgress(data.scheduleProgress ?? null);
      }

      if (tier === "platinum_managed") {
        setRotationLoading(true);
        const orderRes = await fetch(
          `/api/moderator/members/audio-order?email=${encodeURIComponent(email)}`
        );
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setRotationOrder(orderData.order ?? []);
        }
        setRotationLoading(false);
      }
    } catch {
      setStatus("Could not load member details.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await loadMembers();
      } catch {
        setStatus("Facilitator access required.");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMembers]);

  useEffect(() => {
    if (!selectedEmail) return;
    const member = members.find((m) => m.email === selectedEmail);
    void loadMemberDetail(selectedEmail, member?.subscriptionTier ?? null);
  }, [selectedEmail, members, loadMemberDetail]);

  const persistRotation = async (email: string, order: string[]) => {
    setRotationSaveStatus("Saving rotation…");
    const response = await fetch("/api/moderator/members/audio-order", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, order })
    });
    if (response.ok) {
      setRotationSaveStatus(
        order.length === 0
          ? "Rotation cleared on server."
          : `Saved ${order.length} rotation step${order.length === 1 ? "" : "s"}.`
      );
      return true;
    }
    const data = await response.json().catch(() => ({}));
    setRotationSaveStatus(data?.error || "Rotation save failed.");
    setStatus(data?.error || "Rotation save failed.");
    return false;
  };

  const addRotationSlot = () => {
    if (!selectedEmail || !pickerId.trim()) return;
    const id = pickerId.trim();
    if (countInOrder(rotationOrder, id) >= MANAGED_MAX_SLOTS_PER_AUDIO) {
      setStatus(
        `This recording is already in the rotation ${MANAGED_MAX_SLOTS_PER_AUDIO} times (maximum).`
      );
      return;
    }
    const next = [...rotationOrder, id];
    setRotationOrder(next);
    setPickerId("");
    void persistRotation(selectedEmail, next);
  };

  const removeRotationSlot = (index: number) => {
    if (!selectedEmail) return;
    const next = rotationOrder.filter((_, i) => i !== index);
    setRotationOrder(next);
    void persistRotation(selectedEmail, next);
  };

  const moveRotationSlot = (index: number, direction: "up" | "down") => {
    if (!selectedEmail) return;
    const j = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || index >= rotationOrder.length || j < 0 || j >= rotationOrder.length) return;
    const next = [...rotationOrder];
    const t = next[index];
    next[index] = next[j];
    next[j] = t;
    setRotationOrder(next);
    void persistRotation(selectedEmail, next);
  };

  const uploadFacilitatorAudioFile = async (fileInput: HTMLInputElement | null) => {
    const file = fileInput?.files?.[0];
    if (!file) {
      setAudioUploadStatus("Choose a file first.");
      return;
    }
    setAudioUploading(true);
    setAudioUploadStatus(null);
    const pathname = `audios/${sanitizePathSegment(file.name.replace(/\.[^.]+$/, "") || "audio")}${file.name.match(/\.[^.]+$/)?.[0] || ".mp3"}`;
    const useMultipart = file.size > 5 * 1024 * 1024;
    try {
      const tokenRes = await fetch("/api/moderator/upload-audio-handler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "blob.generate-client-token",
          payload: { pathname, clientPayload: null, multipart: useMultipart }
        })
      });
      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) {
        setAudioUploadStatus(tokenData?.error || "Upload failed.");
        return;
      }
      const clientToken = tokenData?.clientToken;
      if (!clientToken) {
        setAudioUploadStatus("Upload failed: no token from server.");
        return;
      }
      const blob = await put(pathname, file, {
        access: "public",
        token: clientToken,
        multipart: useMultipart
      });
      const url = blob?.url || "";
      setAudioDraft((d) => ({ ...d, audioUrl: url }));
      setAudioUploadStatus(
        url ? "Upload complete — add title and description, then save." : "Upload finished but no URL returned."
      );
      if (fileInput) fileInput.value = "";
    } catch (e) {
      setAudioUploadStatus(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setAudioUploading(false);
    }
  };

  const saveFacilitatorAudio = async () => {
    const memberEmails = members.filter((m) => audioMemberPick[m.email]).map((m) => m.email);
    if (!audioDraft.title.trim() || !audioDraft.description.trim() || !audioDraft.audioUrl.trim()) {
      setAudioSaveStatus("Title, description, and audio URL are required.");
      return;
    }
    if (memberEmails.length === 0) {
      setAudioSaveStatus("Select at least one assigned member.");
      return;
    }
    setAudioSaveStatus(null);
    const res = await fetch("/api/moderator/facilitator-audios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: audioDraft.title.trim(),
        description: audioDraft.description.trim(),
        audioUrl: audioDraft.audioUrl.trim(),
        coverUrl: audioDraft.coverUrl.trim(),
        skuCode: audioDraft.skuCode.trim(),
        memberEmails
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAudioSaveStatus(data?.error || "Could not save audio.");
      return;
    }
    setAudioSaveStatus("Audio saved for your selected members.");
    setAudioDraft({ title: "", description: "", audioUrl: "", coverUrl: "", skuCode: "" });
    await loadFacilitatorAudios();
    const libRes = await fetch("/api/moderator/library");
    if (libRes.ok) {
      const libData = await libRes.json();
      setLibrary(libData.library ?? []);
    }
  };

  const createAssignedMember = async () => {
    const email = newMemberEmail.trim();
    if (!email || newMemberPassword.length < 6) {
      setNewMemberSaveStatus("Email and password (6+ characters) are required.");
      return;
    }
    setNewMemberSaveStatus(null);
    setStatus(null);
    const res = await fetch("/api/moderator/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: newMemberPassword,
        firstName: newMemberFirstName.trim() || undefined,
        lastName: newMemberLastName.trim() || undefined,
        tier: newMemberTier,
        status: newMemberStatus,
        playsPerNight: 2
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setNewMemberSaveStatus(data?.error || "Could not create member.");
      return;
    }
    setNewMemberSaveStatus(data?.message || "Member saved.");
    setNewMemberEmail("");
    setNewMemberPassword("");
    setNewMemberFirstName("");
    setNewMemberLastName("");
    await loadMembers();
  };

  const sortedLibrary = useMemo(
    () =>
      library.slice().sort((a, b) => {
        const skuA = (a.skuCode || "").trim();
        const skuB = (b.skuCode || "").trim();
        if (skuA && !skuB) return -1;
        if (!skuA && skuB) return 1;
        if (skuA && skuB) {
          return skuA.localeCompare(skuB, undefined, { numeric: true, sensitivity: "base" });
        }
        return (a.title || "").localeCompare(b.title || "");
      }),
    [library]
  );

  if (loading) {
    return (
      <section className="card">
        <p>Loading your clients…</p>
      </section>
    );
  }

  return (
    <>
      <section className="hero" style={{ marginBottom: 24 }}>
        <span className="pill">Facilitator Console</span>
        <h1>Welcome, {facilitatorName || "Facilitator"}</h1>
        <p>
          Manage members assigned to you — add clients, upload member audios, view activity, and edit
          Platinum Managed rotations.
        </p>
      </section>

      {status && (
        <p className="card" style={{ marginBottom: 16, color: "#b91c1c" }} role="status">
          {status}
        </p>
      )}

      <div
        className="grid"
        style={{ gridTemplateColumns: "minmax(220px, 280px) 1fr", gap: 16, alignItems: "start" }}
      >
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Your clients</h2>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 0 }}>
            Tap a client to open details; tap again to close.
          </p>
          {members.length === 0 ? (
            <p style={{ color: "#64748b", lineHeight: 1.6 }}>
              No clients yet. Use <strong>Add new member</strong> below to create one, or ask admin to
              assign existing members in Facilitators Section.
            </p>
          ) : (
            <div className="stack">
              {members.map((member) => (
                <button
                  key={member.email}
                  type="button"
                  className="button button-secondary"
                  aria-pressed={selectedEmail === member.email}
                  style={{
                    textAlign: "center",
                    background: selectedEmail === member.email ? "#ecfdf5" : undefined,
                    borderColor: selectedEmail === member.email ? "#10b981" : undefined
                  }}
                  onClick={() => {
                    setStatus(null);
                    setSelectedEmail((prev) =>
                      prev === member.email ? null : member.email
                    );
                  }}
                >
                  <strong>{memberLabel(member)}</strong>
                  <br />
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {member.registered
                      ? `${tierLabel(member.subscriptionTier)} · ${member.subscriptionStatus ?? "inactive"}`
                      : "Not registered yet"}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
            <button
              type="button"
              className={adminSectionToggleClass(addMemberOpen, true)}
              aria-expanded={addMemberOpen}
              onClick={() => setAddMemberOpen((open) => !open)}
            >
              {addMemberOpen ? "▼" : "▶"} Add new member
            </button>
            {addMemberOpen && (
              <div className="card" style={{ marginTop: 8 }}>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, lineHeight: 1.5 }}>
                  Creates a member account and assigns them to you automatically. They can sign in at{" "}
                  <strong>/member/login</strong> with the password you set. Use <strong>Inactive</strong> until
                  billing is set up, or <strong>Active</strong> for testing.
                </p>
                <div className="stack" style={{ gap: 8 }}>
                  <input
                    style={inputStyle}
                    placeholder="Email *"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                  />
                  <input
                    style={inputStyle}
                    placeholder="Temporary password (min 6 characters) *"
                    type="password"
                    autoComplete="new-password"
                    value={newMemberPassword}
                    onChange={(e) => setNewMemberPassword(e.target.value)}
                  />
                  <input
                    style={inputStyle}
                    placeholder="First name (optional)"
                    value={newMemberFirstName}
                    onChange={(e) => setNewMemberFirstName(e.target.value)}
                  />
                  <input
                    style={inputStyle}
                    placeholder="Last name (optional)"
                    value={newMemberLastName}
                    onChange={(e) => setNewMemberLastName(e.target.value)}
                  />
                  <select
                    style={inputStyle}
                    value={newMemberTier}
                    onChange={(e) =>
                      setNewMemberTier(e.target.value as "platinum" | "platinum_managed")
                    }
                  >
                    <option value="platinum">Gold Member</option>
                    <option value="platinum_managed">Platinum Managed Member</option>
                  </select>
                  <select
                    style={inputStyle}
                    value={newMemberStatus}
                    onChange={(e) =>
                      setNewMemberStatus(e.target.value as "inactive" | "active")
                    }
                  >
                    <option value="inactive">Inactive (until billing)</option>
                    <option value="active">Active</option>
                  </select>
                  <button type="button" className="button" onClick={() => void createAssignedMember()}>
                    Create member
                  </button>
                  {newMemberSaveStatus && (
                    <p
                      style={{
                        fontSize: 12,
                        margin: 0,
                        color: newMemberSaveStatus.includes("Could not") ? "#b91c1c" : "#047857"
                      }}
                    >
                      {newMemberSaveStatus}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
            <button
              type="button"
              className={adminSectionToggleClass(memberAudiosOpen, true)}
              aria-expanded={memberAudiosOpen}
              onClick={() => setMemberAudiosOpen((open) => !open)}
            >
              {memberAudiosOpen ? "▼" : "▶"} Member audios
              {facilitatorAudios.length ? ` — ${facilitatorAudios.length}` : ""}
            </button>
            {memberAudiosOpen && (
              <div className="card" style={{ marginTop: 8 }}>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, lineHeight: 1.5 }}>
                  Upload recordings for your assigned members only. They appear in rotation pickers
                  and in the library for those members. Admin can later include a track in the
                  general library for everyone.
                </p>
                {facilitatorAudios.length > 0 ? (
                  <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 13 }}>
                    {facilitatorAudios.map((row) => (
                      <li key={row.id} style={{ marginBottom: 6 }}>
                        <strong>{row.title}</strong>
                        {row.inGeneralCatalog ? (
                          <span style={{ color: "#047857", fontSize: 12 }}> · in general library</span>
                        ) : (
                          <span style={{ color: "#92400e", fontSize: 12 }}> · members only</span>
                        )}
                        <br />
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          {row.allowedUserEmails.length} member
                          {row.allowedUserEmails.length === 1 ? "" : "s"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>No audios yet.</p>
                )}
                {members.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#92400e" }}>
                    Assign members before uploading audio.
                  </p>
                ) : (
                  <div className="stack" style={{ gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>Members who can access this audio</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {members.map((m) => (
                        <label
                          key={m.email}
                          style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}
                        >
                          <input
                            type="checkbox"
                            checked={audioMemberPick[m.email] ?? true}
                            onChange={(e) =>
                              setAudioMemberPick((p) => ({ ...p, [m.email]: e.target.checked }))
                            }
                          />
                          {memberLabel(m)}
                        </label>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                        <span style={{ fontSize: 12 }}>Audio file (up to 100 MB)</span>
                        <input type="file" accept="audio/*" id="facilitator-audio-file" style={inputStyle} />
                      </label>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={audioUploading}
                        onClick={() => {
                          const el = document.getElementById(
                            "facilitator-audio-file"
                          ) as HTMLInputElement | null;
                          uploadFacilitatorAudioFile(el);
                        }}
                      >
                        {audioUploading ? "Uploading…" : "Upload file"}
                      </button>
                    </div>
                    {audioUploadStatus && (
                      <p style={{ fontSize: 12, margin: 0, color: "#475569" }}>{audioUploadStatus}</p>
                    )}
                    <input
                      style={inputStyle}
                      placeholder="Title *"
                      value={audioDraft.title}
                      onChange={(e) => setAudioDraft((d) => ({ ...d, title: e.target.value }))}
                    />
                    <input
                      style={inputStyle}
                      placeholder="Description *"
                      value={audioDraft.description}
                      onChange={(e) => setAudioDraft((d) => ({ ...d, description: e.target.value }))}
                    />
                    <input
                      style={inputStyle}
                      placeholder="Audio URL * (filled after upload)"
                      value={audioDraft.audioUrl}
                      onChange={(e) => setAudioDraft((d) => ({ ...d, audioUrl: e.target.value }))}
                    />
                    <input
                      style={inputStyle}
                      placeholder="Cover URL (optional)"
                      value={audioDraft.coverUrl}
                      onChange={(e) => setAudioDraft((d) => ({ ...d, coverUrl: e.target.value }))}
                    />
                    <input
                      style={inputStyle}
                      placeholder="SKU (optional)"
                      value={audioDraft.skuCode}
                      onChange={(e) => setAudioDraft((d) => ({ ...d, skuCode: e.target.value }))}
                    />
                    <button type="button" className="button" onClick={() => void saveFacilitatorAudio()}>
                      Save audio for selected members
                    </button>
                    {audioSaveStatus && (
                      <p style={{ fontSize: 12, color: "#047857", margin: 0 }}>{audioSaveStatus}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="card">
          {!selectedEmail ? (
            <p style={{ color: "#64748b", lineHeight: 1.6 }}>
              Select a client from the list on the left. You will see profile details, recent
              activity, and—for <strong>Platinum Managed</strong> members—rotation controls to add,
              reorder, and remove schedule steps.
            </p>
          ) : detailLoading ? (
            <p>Loading member details…</p>
          ) : (
            <>
              <h2 style={{ marginTop: 0 }}>{memberLabel(selectedMember!)}</h2>
              <p style={{ color: "#64748b", marginBottom: 16 }}>{selectedEmail}</p>

              <div className="card" style={{ marginBottom: 16, background: "#f8fafc" }}>
                <h3 style={{ marginTop: 0 }}>Profile</h3>
                {!profileDetail?.registered ? (
                  <p style={{ color: "#92400e" }}>
                    This person has not completed signup yet. They will appear here once they
                    register.
                  </p>
                ) : (
                  <div className="stack" style={{ fontSize: 14 }}>
                    <p>
                      <strong>Tier:</strong> {tierLabel(profileDetail.subscriptionTier)} ·{" "}
                      {profileDetail.subscriptionStatus ?? "inactive"}
                    </p>
                    <p>
                      <strong>Session length:</strong>{" "}
                      {profileDetail.playsPerNight === 1
                        ? "Half session (1 audio/night)"
                        : "Full session (2 audios/night)"}
                    </p>
                    {profileDetail.profile?.contactNumber && (
                      <p><strong>Phone:</strong> {profileDetail.profile.contactNumber}</p>
                    )}
                    {profileDetail.profile?.timeZone && (
                      <p><strong>Time zone:</strong> {profileDetail.profile.timeZone}</p>
                    )}
                    {profileDetail.profile?.occupation && (
                      <p><strong>Occupation:</strong> {profileDetail.profile.occupation}</p>
                    )}
                    {profileDetail.profile?.notes && (
                      <p><strong>Notes:</strong> {profileDetail.profile.notes}</p>
                    )}
                  </div>
                )}
              </div>

              {scheduleProgress && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <h3 style={{ marginTop: 0 }}>Schedule progress</h3>
                  <p style={{ margin: 0 }}>
                    Completed nights: <strong>{scheduleProgress.completedScheduleNights}</strong>
                    · Current night: <strong>{scheduleProgress.currentNight}</strong>
                  </p>
                </div>
              )}

              {isManaged && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <h3 style={{ marginTop: 0 }}>Rotation order (Platinum Managed)</h3>
                  <p style={{ fontSize: 13, color: "#64748b", marginTop: 0 }}>
                    This is the member&apos;s live schedule. Each add, move, or remove saves
                    automatically. Same recording may appear up to {MANAGED_MAX_SLOTS_PER_AUDIO}{" "}
                    times.
                  </p>
                  {rotationLoading ? (
                    <p style={{ fontSize: 13, color: "#2563eb" }}>Loading rotation…</p>
                  ) : rotationOrder.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#6b7280" }}>
                      No steps yet — add a recording below.
                    </p>
                  ) : (
                    <ol style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
                      {rotationOrder.map((slotId, idx) => {
                        const libItem = library.find((x) => x.id === slotId);
                        const label =
                          [libItem?.skuCode, libItem?.title].filter(Boolean).join(" – ") || slotId;
                        return (
                          <li
                            key={`slot-${idx}-${slotId}`}
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 8
                            }}
                          >
                            <span style={{ fontWeight: 700, color: "#15803d", minWidth: 36 }}>
                              #{idx + 1}
                            </span>
                            <span style={{ flex: "1 1 140px" }}>{label}</span>
                            <button
                              type="button"
                              className="button button-secondary"
                              style={{ padding: "2px 10px", fontSize: 12 }}
                              disabled={idx === 0}
                              onClick={() => moveRotationSlot(idx, "up")}
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              className="button button-secondary"
                              style={{ padding: "2px 10px", fontSize: 12 }}
                              disabled={idx >= rotationOrder.length - 1}
                              onClick={() => moveRotationSlot(idx, "down")}
                            >
                              Down
                            </button>
                            <button
                              type="button"
                              className="button button-secondary"
                              style={{ padding: "2px 10px", fontSize: 12 }}
                              onClick={() => removeRotationSlot(idx)}
                            >
                              Remove
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <select
                      aria-label="Choose recording to add"
                      value={pickerId}
                      disabled={rotationLoading}
                      onChange={(e) => setPickerId(e.target.value)}
                      style={{ ...inputStyle, maxWidth: 360, flex: "1 1 240px" }}
                    >
                      <option value="">Choose recording…</option>
                      {sortedLibrary.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.skuCode ? `${item.skuCode} — ` : ""}
                          {item.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={rotationLoading || !pickerId}
                      onClick={addRotationSlot}
                    >
                      Add at end
                    </button>
                  </div>
                  {rotationSaveStatus && (
                    <p style={{ fontSize: 12, color: "#047857", marginTop: 8 }}>{rotationSaveStatus}</p>
                  )}
                </div>
              )}

              <div className="card">
                <h3 style={{ marginTop: 0 }}>Recent activity</h3>
                {activity.length === 0 ? (
                  <p style={{ color: "#6b7280" }}>No activity recorded yet.</p>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "6px 8px" }}>When</th>
                          <th style={{ padding: "6px 8px" }}>Action</th>
                          <th style={{ padding: "6px 8px" }}>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.map((row) => (
                          <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "6px 8px", verticalAlign: "top" }}>
                              {new Date(row.createdAt).toLocaleString()}
                            </td>
                            <td style={{ padding: "6px 8px", verticalAlign: "top" }}>{row.action}</td>
                            <td style={{ padding: "6px 8px", verticalAlign: "top", color: "#64748b" }}>
                              {row.details || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
