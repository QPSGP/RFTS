"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import { adminSectionToggleClass } from "@/components/admin-section-toggle";

const dashboardSections = {
  summary: false,
  memberActivity: false,
  recentMemberActivity: false,
  staffActivity: false
} as const;

type DashboardSection = keyof typeof dashboardSections;

type Summary = {
  totalMembers: number;
  activeSubscriptions: number;
  newThisMonth: number;
  totalSessionsUsedToday?: number;
  totalSessionsUsedLast7?: number;
};

type MemberRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  goalUpdatedAt: string | null;
  subscriptionStatus: string | null;
  subscriptionTier: string | null;
  currentPeriodEnd: string | null;
  goalCount: number;
  playsPerNight: number;
  sessionsUsedToday?: number;
  sessionsUsedLast7?: number;
  sessionsTotal?: number;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return "—";
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "—";
  }
}

function formatMemberActivityAction(action: string): string {
  if (action === "played_audio") return "Played audio";
  if (action === "audio_playback_outcome") return "Playback result";
  return action.replace(/_/g, " ");
}

function formatStaffAction(action: string): string {
  return action.replace(/_/g, " ");
}

const thStyle = { padding: "10px 12px", fontWeight: 600 } as const;
const tdStyle = { padding: "10px 12px" } as const;
const tdMutedStyle = { padding: "10px 12px", color: "#4b5563" } as const;

type AdminWithLogin = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
};

type ModeratorWithLogin = {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
};

type ActivityLogEntry = {
  id: string;
  actorType: "admin" | "moderator";
  actorEmail: string;
  actorName: string | null;
  action: string;
  createdAt: string;
};

type MemberActivityLogEntry = {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  action: string;
  details: string | null;
  createdAt: string;
};

type MemberStatusFilter = "all" | "active" | "inactive";

function isMemberActive(subscriptionStatus: string | null): boolean {
  return subscriptionStatus === "active";
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [admins, setAdmins] = useState<AdminWithLogin[]>([]);
  const [moderators, setModerators] = useState<ModeratorWithLogin[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [memberActivityLog, setMemberActivityLog] = useState<MemberActivityLogEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized">("loading");
  const [openSections, setOpenSections] = useState(dashboardSections);
  const [memberStatusFilter, setMemberStatusFilter] = useState<MemberStatusFilter>("all");

  const filteredMembers = useMemo(() => {
    if (memberStatusFilter === "all") return members;
    if (memberStatusFilter === "active") {
      return members.filter((m) => isMemberActive(m.subscriptionStatus));
    }
    return members.filter((m) => !isMemberActive(m.subscriptionStatus));
  }, [members, memberStatusFilter]);

  const staffRoster = useMemo(
    () =>
      [
        ...admins.map((a) => ({
          id: `admin-${a.id}`,
          role: "Admin" as const,
          name: [a.firstName, a.lastName].filter(Boolean).join(" ").trim() || "—",
          email: a.email,
          status: a.status,
          lastLoginAt: a.lastLoginAt
        })),
        ...moderators.map((m) => ({
          id: `moderator-${m.id}`,
          role: "Facilitator" as const,
          name: m.name,
          email: m.email,
          status: m.status,
          lastLoginAt: m.lastLoginAt
        }))
      ].sort((a, b) => {
        if (a.role !== b.role) return a.role === "Admin" ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }),
    [admins, moderators]
  );

  const toggleSection = (key: DashboardSection, id: string) => {
    setOpenSections((prev) => {
      const nextOpen = !prev[key];
      if (nextOpen) {
        requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return { ...dashboardSections, [key]: true };
      }
      return { ...prev, [key]: false };
    });
  };

  useEffect(() => {
    fetch("/api/admin/analytics", { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          setStatus("unauthorized");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setSummary(data.summary || null);
          setMembers(data.members || []);
          setStatus("ready");
          fetch("/api/admin/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "viewed_activity_dashboard" }),
            credentials: "include"
          }).catch(() => {});
        }
      })
      .catch(() => setStatus("unauthorized"));
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    Promise.all([
      fetch("/api/admin/staff-activity", { credentials: "include" }).then((res) =>
        res.ok ? res.json() : null
      ),
      fetch("/api/admin/member-activity", { credentials: "include" }).then((res) =>
        res.ok ? res.json() : null
      )
    ]).then(([staffData, memberData]) => {
      if (staffData) {
        setAdmins(staffData.admins || []);
        setModerators(staffData.moderators || []);
        setActivityLog(staffData.activityLog || []);
      }
      if (memberData) {
        setMemberActivityLog(memberData.activityLog || []);
      }
    });
  }, [status]);

  if (status === "loading") {
    return (
      <main className="admin-page">
        <section style={{ marginBottom: 24 }}>
          <h1>Member Activity Dashboard</h1>
          <p>Loading…</p>
        </section>
      </main>
    );
  }

  if (status === "unauthorized") {
    return (
      <main className="admin-page">
        <section style={{ marginBottom: 24 }}>
          <h1>Member Activity Dashboard</h1>
          <p>Admin login required.</p>
          <Link href="/login" className="button">
            Log in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section
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
          <h1>Member Activity Dashboard</h1>
          <p>Overview of member signups, subscriptions, and usage.</p>
        </div>
        <div className="admin-toolbar">
          <Link href="/admin/marketing" className="button button-secondary" style={{ padding: "8px 12px", fontSize: 13 }}>
            Marketing
          </Link>
          <Link href="/admin/member-issues" className="button button-secondary" style={{ padding: "8px 12px", fontSize: 13 }}>
            Issue reports
          </Link>
          <Link href="/admin/content" className="button button-secondary" style={{ padding: "8px 12px", fontSize: 13 }}>
            Content Console
          </Link>
          <AdminLogoutButton />
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <button
            type="button"
            className={adminSectionToggleClass(openSections.summary, true)}
            aria-expanded={openSections.summary}
            onClick={() => toggleSection("summary", "dashboard-summary")}
          >
            Summary
          </button>
          <button
            type="button"
            className={adminSectionToggleClass(openSections.memberActivity, true)}
            aria-expanded={openSections.memberActivity}
            onClick={() => toggleSection("memberActivity", "dashboard-member-activity")}
          >
            Member activity
          </button>
          <button
            type="button"
            className={adminSectionToggleClass(openSections.recentMemberActivity, true)}
            aria-expanded={openSections.recentMemberActivity}
            onClick={() => toggleSection("recentMemberActivity", "dashboard-recent-member-activity")}
          >
            Recent member activity
          </button>
          <button
            type="button"
            className={adminSectionToggleClass(openSections.staffActivity, true)}
            aria-expanded={openSections.staffActivity}
            onClick={() => toggleSection("staffActivity", "dashboard-staff-activity")}
          >
            Staff activity (Admins & Facilitators)
          </button>
        </div>
      </section>

      {openSections.summary && summary && (
        <section id="dashboard-summary" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12, fontSize: 18 }}>Summary</h2>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="card">
              <strong>Total members</strong>
              <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>{summary.totalMembers}</p>
            </div>
            <div className="card">
              <strong>Membership</strong>
              <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>{summary.activeSubscriptions}</p>
              <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: 13 }}>Active memberships</p>
            </div>
            <div className="card">
              <strong>New this month</strong>
              <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>{summary.newThisMonth}</p>
            </div>
            <div className="card">
              <strong>Sessions used today</strong>
              <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>
                {summary.totalSessionsUsedToday ?? 0}
              </p>
            </div>
            <div className="card">
              <strong>Sessions used (last 7 days)</strong>
              <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>
                {summary.totalSessionsUsedLast7 ?? 0}
              </p>
            </div>
          </div>
        </section>
      )}

      {openSections.memberActivity && (
      <section id="dashboard-member-activity" style={{ fontSize: 14, marginBottom: 24 }}>
        <h2 style={{ marginBottom: 12, fontSize: 18 }}>Member activity</h2>
        <p style={{ color: "#4b5563", marginBottom: 12 }}>
          Signups, subscription status, goals, and session usage for all members.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
            marginBottom: 12
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <span style={{ fontSize: 13, color: "#4b5563" }}>Status</span>
            <select
              value={memberStatusFilter}
              onChange={(event) =>
                setMemberStatusFilter(event.target.value as MemberStatusFilter)
              }
              aria-label="Filter members by active or inactive status"
              style={{
                padding: "6px 10px",
                fontSize: 14,
                border: "1px solid #d1d5db",
                borderRadius: 6,
                background: "#fff"
              }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            Showing {filteredMembers.length} of {members.length}
            {memberStatusFilter === "active"
              ? " (active memberships)"
              : memberStatusFilter === "inactive"
                ? " (inactive / canceled / past due / none)"
                : ""}
            .
          </span>
        </div>
        <p className="admin-table-hint">Swipe sideways for more columns on a small screen.</p>
        <div className="card table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640, fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Signed up</th>
                <th className="admin-col-optional" style={thStyle}>Last goals update</th>
                <th style={thStyle}>Status</th>
                <th className="admin-col-optional" style={thStyle}>Period end</th>
                <th style={thStyle}>Goals</th>
                <th className="admin-col-optional" style={thStyle}>Plays/night</th>
                <th className="admin-col-optional" style={thStyle}>Sessions today</th>
                <th style={thStyle}>Total nightly sessions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={tdStyle}>
                    {m.firstName || m.lastName
                      ? [m.firstName, m.lastName].filter(Boolean).join(" ").trim()
                      : m.email}
                  </td>
                  <td style={tdMutedStyle}>{formatDate(m.createdAt)}</td>
                  <td className="admin-col-optional" style={tdMutedStyle}>{formatDate(m.goalUpdatedAt)}</td>
                  <td style={tdStyle}>{m.subscriptionStatus ?? "—"}</td>
                  <td className="admin-col-optional" style={tdMutedStyle}>{formatDate(m.currentPeriodEnd)}</td>
                  <td style={tdStyle}>{m.goalCount}</td>
                  <td className="admin-col-optional" style={tdStyle}>{m.playsPerNight}</td>
                  <td className="admin-col-optional" style={tdStyle}>{m.sessionsUsedToday ?? 0}</td>
                  <td style={tdStyle}>{m.sessionsTotal ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {members.length === 0 && (
            <p style={{ padding: 24, color: "#6b7280" }}>No members yet.</p>
          )}
          {members.length > 0 && filteredMembers.length === 0 && (
            <p style={{ padding: 24, color: "#6b7280" }}>
              No {memberStatusFilter} members.
            </p>
          )}
        </div>
      </section>
      )}

      {openSections.recentMemberActivity && (
      <section id="dashboard-recent-member-activity" style={{ marginBottom: 24, fontSize: 14 }}>
        <h2 style={{ marginBottom: 12, fontSize: 18 }}>Recent member activity</h2>
        <p style={{ color: "#4b5563", marginBottom: 12 }}>
          Logins, console and library playback, and other actions. Details show the audio or page when relevant.
        </p>
        <p className="admin-table-hint">Swipe sideways if details are cut off.</p>
        <div className="card table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500, fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={thStyle}>When</th>
                <th style={thStyle}>Member</th>
                <th style={thStyle}>Action</th>
                <th className="admin-col-optional" style={thStyle}>Details</th>
              </tr>
            </thead>
            <tbody>
              {memberActivityLog.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={tdMutedStyle}>{formatDateTime(entry.createdAt)}</td>
                  <td style={tdStyle}>
                    {entry.firstName || entry.lastName
                      ? [entry.firstName, entry.lastName].filter(Boolean).join(" ").trim()
                      : entry.email}
                    {entry.firstName || entry.lastName ? (
                      <span style={{ color: "#6b7280", fontSize: 12 }}> ({entry.email})</span>
                    ) : null}
                  </td>
                  <td style={tdStyle}>{formatMemberActivityAction(entry.action)}</td>
                  <td className="admin-col-optional" style={tdMutedStyle}>{entry.details ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {memberActivityLog.length === 0 && (
            <p style={{ padding: 12, color: "#6b7280", margin: 0 }}>No member activity recorded yet.</p>
          )}
        </div>
      </section>
      )}

      {openSections.staffActivity && (
      <section id="dashboard-staff-activity" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 12, fontSize: 18 }}>Staff activity (Admins &amp; Facilitators)</h2>
        <div className="grid grid-2" style={{ gap: 12, marginBottom: 16 }}>
          <div className="card">
            <strong>Admins</strong>
            <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>{admins.length}</p>
            <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: 13 }}>Registered admin accounts</p>
          </div>
          <div className="card">
            <strong>Facilitators</strong>
            <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>{moderators.length}</p>
            <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: 13 }}>Approved facilitator accounts</p>
          </div>
        </div>

        <p className="admin-table-hint">Swipe sideways for email and last login.</p>
        <div className="card table-scroll" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0, fontSize: 16 }}>Staff roster</h3>
          <p style={{ color: "#4b5563", fontSize: 14, marginTop: 0, marginBottom: 12 }}>
            Admins and facilitators in one list, sorted by role then name.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560, fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Name</th>
                <th className="admin-col-optional" style={thStyle}>Email</th>
                <th style={thStyle}>Status</th>
                <th className="admin-col-optional" style={thStyle}>Last login</th>
              </tr>
            </thead>
            <tbody>
              {staffRoster.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: row.role === "Admin" ? "#dbeafe" : "#dcfce7",
                        color: row.role === "Admin" ? "#1e40af" : "#166534"
                      }}
                    >
                      {row.role}
                    </span>
                  </td>
                  <td style={tdStyle}>{row.name}</td>
                  <td className="admin-col-optional" style={tdStyle}>{row.email}</td>
                  <td style={tdStyle}>{row.status}</td>
                  <td className="admin-col-optional" style={tdMutedStyle}>{formatDateTime(row.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {staffRoster.length === 0 && (
            <p style={{ padding: 12, color: "#6b7280", margin: 0 }}>No staff accounts yet.</p>
          )}
        </div>

        <div className="card table-scroll">
          <h3 style={{ marginTop: 0, fontSize: 16 }}>Recent staff actions</h3>
          <p style={{ color: "#4b5563", fontSize: 14, marginTop: 0, marginBottom: 12 }}>
            Logins and console actions from admins and facilitators.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520, fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={thStyle}>When</th>
                <th style={thStyle}>Who</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {activityLog.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={tdMutedStyle}>{formatDateTime(entry.createdAt)}</td>
                  <td style={tdStyle}>
                    {entry.actorName || entry.actorEmail}
                    {entry.actorName && (
                      <span style={{ color: "#6b7280", fontSize: 12 }}> ({entry.actorEmail})</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: entry.actorType === "admin" ? "#dbeafe" : "#dcfce7",
                        color: entry.actorType === "admin" ? "#1e40af" : "#166534"
                      }}
                    >
                      {entry.actorType === "admin" ? "Admin" : "Facilitator"}
                    </span>
                  </td>
                  <td style={tdStyle}>{formatStaffAction(entry.action)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {activityLog.length === 0 && (
            <p style={{ padding: 12, color: "#6b7280", margin: 0 }}>No activity recorded yet.</p>
          )}
        </div>
      </section>
      )}
    </main>
  );
}
