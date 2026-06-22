"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MANAGED_MAX_SLOTS_PER_AUDIO } from "@/lib/managed-rotation-limits";

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
          Manage the members assigned to you. You can view their profile and activity, and edit
          Platinum Managed rotation schedules.
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
              No members assigned yet. Ask your admin to add member emails in{" "}
              <strong>Admin → Content → Facilitators Section → Active Facilitators → Assigned member
              emails</strong>, then click <strong>Save account</strong>. After that, select a client here
              to view profile, activity, and rotation controls.
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
