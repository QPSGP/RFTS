"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";

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
  return action.replace(/_/g, " ");
}

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

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [admins, setAdmins] = useState<AdminWithLogin[]>([]);
  const [moderators, setModerators] = useState<ModeratorWithLogin[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [memberActivityLog, setMemberActivityLog] = useState<MemberActivityLogEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized">("loading");

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
      <main>
        <section style={{ marginBottom: 24 }}>
          <h1>Member Activity Dashboard</h1>
          <p>Loading…</p>
        </section>
      </main>
    );
  }

  if (status === "unauthorized") {
    return (
      <main>
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
    <main>
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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/admin/content" className="button button-secondary" style={{ padding: "8px 12px", fontSize: 13 }}>
            Content Console
          </Link>
          <AdminLogoutButton />
        </div>
      </section>

      {summary && (
        <section style={{ marginBottom: 24 }}>
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

      <section style={{ fontSize: 14 }}>
        <h2 style={{ marginBottom: 12, fontSize: 18 }}>Member activity</h2>
        <div className="card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640, fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Name</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Signed up</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Last goals update</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Period end</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Goals</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Plays/night</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Sessions today</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Total nightly sessions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 12px" }}>
                    {m.firstName || m.lastName
                      ? [m.firstName, m.lastName].filter(Boolean).join(" ").trim()
                      : m.email}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#4b5563" }}>{formatDate(m.createdAt)}</td>
                  <td style={{ padding: "10px 12px", color: "#4b5563" }}>{formatDate(m.goalUpdatedAt)}</td>
                  <td style={{ padding: "10px 12px" }}>{m.subscriptionStatus ?? "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#4b5563" }}>{formatDate(m.currentPeriodEnd)}</td>
                  <td style={{ padding: "10px 12px" }}>{m.goalCount}</td>
                  <td style={{ padding: "10px 12px" }}>{m.playsPerNight}</td>
                  <td style={{ padding: "10px 12px" }}>{m.sessionsUsedToday ?? 0}</td>
                  <td style={{ padding: "10px 12px" }}>{m.sessionsTotal ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {members.length === 0 && (
            <p style={{ padding: 24, color: "#6b7280" }}>No members yet.</p>
          )}
        </div>
      </section>

      <section style={{ marginTop: 32, fontSize: 14 }}>
        <h2 style={{ marginBottom: 12, fontSize: 18 }}>Recent member activity</h2>
        <p style={{ color: "#4b5563", marginBottom: 12 }}>
          Logins, console and library playback, and other actions. Details show the audio or page when relevant.
        </p>
        <div className="card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500, fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "8px 10px", fontWeight: 600 }}>When</th>
                <th style={{ padding: "8px 10px", fontWeight: 600 }}>Member</th>
                <th style={{ padding: "8px 10px", fontWeight: 600 }}>Action</th>
                <th style={{ padding: "8px 10px", fontWeight: 600 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {memberActivityLog.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px 10px", color: "#4b5563" }}>{formatDateTime(entry.createdAt)}</td>
                  <td style={{ padding: "8px 10px" }}>
                    {entry.firstName || entry.lastName
                      ? [entry.firstName, entry.lastName].filter(Boolean).join(" ").trim()
                      : entry.email}
                    {entry.firstName || entry.lastName ? (
                      <span style={{ color: "#6b7280", fontSize: 12 }}> ({entry.email})</span>
                    ) : null}
                  </td>
                  <td style={{ padding: "8px 10px" }}>{formatMemberActivityAction(entry.action)}</td>
                  <td style={{ padding: "8px 10px", color: "#4b5563" }}>{entry.details ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {memberActivityLog.length === 0 && (
            <p style={{ padding: 12, color: "#6b7280", margin: 0 }}>No member activity recorded yet.</p>
          )}
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ marginBottom: 12, fontSize: 18 }}>Staff activity (Admins &amp; Facilitators)</h2>
        <div className="grid grid-2" style={{ gap: 24, marginBottom: 24 }}>
          <div className="card">
            <h3 style={{ marginTop: 0, fontSize: 16 }}>Admins</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Name</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Email</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Last login</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "8px 10px" }}>
                      {[a.firstName, a.lastName].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>{a.email}</td>
                    <td style={{ padding: "8px 10px" }}>{a.status}</td>
                    <td style={{ padding: "8px 10px", color: "#4b5563" }}>{formatDateTime(a.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {admins.length === 0 && <p style={{ padding: 12, color: "#6b7280", margin: 0 }}>No admins.</p>}
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0, fontSize: 16 }}>Facilitators</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Name</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Email</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Last login</th>
                </tr>
              </thead>
              <tbody>
                {moderators.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "8px 10px" }}>{m.name}</td>
                    <td style={{ padding: "8px 10px" }}>{m.email}</td>
                    <td style={{ padding: "8px 10px" }}>{m.status}</td>
                    <td style={{ padding: "8px 10px", color: "#4b5563" }}>{formatDateTime(m.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {moderators.length === 0 && <p style={{ padding: 12, color: "#6b7280", margin: 0 }}>No facilitators.</p>}
          </div>
        </div>
        <div className="card" style={{ overflowX: "auto" }}>
          <h3 style={{ marginTop: 0, fontSize: 16 }}>Recent activity (logins and actions)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "8px 10px", fontWeight: 600 }}>When</th>
                <th style={{ padding: "8px 10px", fontWeight: 600 }}>Who</th>
                <th style={{ padding: "8px 10px", fontWeight: 600 }}>Role</th>
                <th style={{ padding: "8px 10px", fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {activityLog.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "8px 10px", color: "#4b5563" }}>{formatDateTime(entry.createdAt)}</td>
                  <td style={{ padding: "8px 10px" }}>
                    {entry.actorName || entry.actorEmail}
                    {entry.actorName && <span style={{ color: "#6b7280", fontSize: 12 }}> ({entry.actorEmail})</span>}
                  </td>
                  <td style={{ padding: "8px 10px" }}>{entry.actorType === "admin" ? "Admin" : "Facilitator"}</td>
                  <td style={{ padding: "8px 10px" }}>{entry.action.replace(/_/g, " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {activityLog.length === 0 && (
            <p style={{ padding: 12, color: "#6b7280", margin: 0 }}>No activity recorded yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
