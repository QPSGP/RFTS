"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";

type Summary = {
  totalMembers: number;
  activeSubscriptions: number;
  byTier: { bronze: number; gold: number; platinum: number };
  newThisMonth: number;
};

type MemberRow = {
  id: string;
  email: string;
  createdAt: string;
  goalUpdatedAt: string | null;
  subscriptionStatus: string | null;
  subscriptionTier: string | null;
  currentPeriodEnd: string | null;
  goalCount: number;
  playsPerNight: number;
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

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
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
        }
      })
      .catch(() => setStatus("unauthorized"));
  }, []);

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
              <strong>Active subscriptions</strong>
              <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>{summary.activeSubscriptions}</p>
            </div>
            <div className="card">
              <strong>New this month</strong>
              <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>{summary.newThisMonth}</p>
            </div>
            <div className="card">
              <strong>Active by tier</strong>
              <p style={{ margin: "4px 0 0", color: "#4b5563" }}>
                Bronze: {summary.byTier.bronze} · Gold: {summary.byTier.gold} · Platinum: {summary.byTier.platinum}
              </p>
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 style={{ marginBottom: 12, fontSize: 18 }}>Member activity</h2>
        <div className="card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Email</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Signed up</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Last goals update</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Tier</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Period end</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Goals</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Plays/night</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 12px" }}>{m.email}</td>
                  <td style={{ padding: "10px 12px", color: "#4b5563" }}>{formatDate(m.createdAt)}</td>
                  <td style={{ padding: "10px 12px", color: "#4b5563" }}>{formatDate(m.goalUpdatedAt)}</td>
                  <td style={{ padding: "10px 12px" }}>{m.subscriptionStatus ?? "—"}</td>
                  <td style={{ padding: "10px 12px" }}>{m.subscriptionTier ?? "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#4b5563" }}>{formatDate(m.currentPeriodEnd)}</td>
                  <td style={{ padding: "10px 12px" }}>{m.goalCount}</td>
                  <td style={{ padding: "10px 12px" }}>{m.playsPerNight}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {members.length === 0 && (
            <p style={{ padding: 24, color: "#6b7280" }}>No members yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
