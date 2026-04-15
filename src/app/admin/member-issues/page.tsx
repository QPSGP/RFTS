"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLogoutButton from "@/components/AdminLogoutButton";

type Report = {
  id: string;
  userId: string;
  memberEmail: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
};

type StatusFilter = "all" | "open" | "in_progress" | "resolved" | "closed";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return iso;
  }
}

const STATUS_OPTIONS: { value: Report["status"]; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" }
];

export default function AdminMemberIssuesPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [drafts, setDrafts] = useState<
    Record<string, { status: string; resolutionNotes: string }>
  >({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setStatusMsg(null);
    const res = await fetch("/api/admin/member-issue-reports", { credentials: "include" });
    if (res.status === 401) {
      setUnauthorized(true);
      setReports([]);
      setLoading(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    const list: Report[] = Array.isArray(data.reports) ? data.reports : [];
    setReports(list);
    const nextDrafts: Record<string, { status: string; resolutionNotes: string }> = {};
    for (const r of list) {
      nextDrafts[r.id] = {
        status: r.status,
        resolutionNotes: r.resolutionNotes ?? ""
      };
    }
    setDrafts(nextDrafts);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    fetch("/api/admin/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "viewed_member_issue_reports" }),
      credentials: "include"
    }).catch(() => {});
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return reports;
    return reports.filter((r) => r.status === filter);
  }, [reports, filter]);

  const save = async (id: string) => {
    const d = drafts[id];
    if (!d) return;
    setSavingId(id);
    setStatusMsg(null);
    const res = await fetch("/api/admin/member-issue-reports", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status: d.status,
        resolutionNotes: d.resolutionNotes.trim() || null
      })
    });
    const data = await res.json().catch(() => ({}));
    setSavingId(null);
    if (!res.ok) {
      setStatusMsg(typeof data?.error === "string" ? data.error : "Save failed.");
      return;
    }
    setStatusMsg("Saved.");
    await load();
  };

  if (unauthorized) {
    return (
      <main>
        <h1>Member issue reports</h1>
        <p>Admin login required.</p>
        <Link href="/login" className="button">
          Log in
        </Link>
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
          <h1>Member issue reports</h1>
          <p style={{ color: "#4b5563", maxWidth: 640 }}>
            Reports submitted from <strong>Report an issue</strong> (after email to the team succeeds). Update
            status and resolution notes so everyone knows how each item was handled.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="button button-secondary" style={{ fontSize: 13 }} onClick={() => void load()}>
            Refresh
          </button>
          <Link href="/admin/dashboard" className="button button-secondary" style={{ padding: "8px 12px", fontSize: 13 }}>
            Activity Dashboard
          </Link>
          <Link href="/admin/content" className="button button-secondary" style={{ padding: "8px 12px", fontSize: 13 }}>
            Content Console
          </Link>
          <AdminLogoutButton />
        </div>
      </section>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {(
          [
            ["all", "All"],
            ["open", "Open"],
            ["in_progress", "In progress"],
            ["resolved", "Resolved"],
            ["closed", "Closed"]
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={filter === key ? "button" : "button button-secondary"}
            style={{ fontSize: 13 }}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {statusMsg && (
        <p className="status-message status-message--success" style={{ marginBottom: 12 }}>
          {statusMsg}
        </p>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "#6b7280" }}>
            {reports.length === 0
              ? "No reports stored yet. Run the latest database schema (member_issue_reports table), then new member reports will appear here after email sends successfully."
              : "No reports match this filter."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 720 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>When</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Member</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Category</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Subject</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Resolution</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb", verticalAlign: "top" }}>
                  <td style={{ padding: "10px 8px", color: "#4b5563", whiteSpace: "nowrap" }}>
                    {formatWhen(r.createdAt)}
                  </td>
                  <td style={{ padding: "10px 8px" }}>{r.memberEmail}</td>
                  <td style={{ padding: "10px 8px", color: "#4b5563" }}>{r.category || "—"}</td>
                  <td style={{ padding: "10px 8px" }}>
                    <strong>{r.subject}</strong>
                    <div style={{ marginTop: 6 }}>
                      <button
                        type="button"
                        className="button button-secondary"
                        style={{ fontSize: 12, padding: "4px 8px" }}
                        onClick={() => setExpanded((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}
                      >
                        {expanded[r.id] ? "Hide message" : "View message"}
                      </button>
                    </div>
                    {expanded[r.id] ? (
                      <pre
                        style={{
                          marginTop: 8,
                          padding: 10,
                          background: "#f9fafb",
                          borderRadius: 8,
                          fontSize: 13,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          maxWidth: 420
                        }}
                      >
                        {r.message}
                      </pre>
                    ) : null}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <select
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        border: "1px solid #d1d5db",
                        fontSize: 13,
                        maxWidth: 140
                      }}
                      value={drafts[r.id]?.status ?? r.status}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [r.id]: { ...prev[r.id], status: e.target.value, resolutionNotes: prev[r.id]?.resolutionNotes ?? "" }
                        }))
                      }
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "10px 8px", minWidth: 220 }}>
                    <label className="sr-only" htmlFor={`res-${r.id}`}>
                      Resolution notes for {r.subject}
                    </label>
                    <textarea
                      id={`res-${r.id}`}
                      placeholder="How it was resolved (visible to admins on this page)"
                      style={{
                        width: "100%",
                        minHeight: 72,
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #d1d5db",
                        fontSize: 13,
                        resize: "vertical"
                      }}
                      value={drafts[r.id]?.resolutionNotes ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [r.id]: { ...prev[r.id], status: prev[r.id]?.status ?? r.status, resolutionNotes: e.target.value }
                        }))
                      }
                    />
                    {r.resolvedAt && (r.status === "resolved" || r.status === "closed") ? (
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "6px 0 0" }}>
                        Last marked {r.status}: {formatWhen(r.resolvedAt)}
                        {r.resolvedBy ? ` · ${r.resolvedBy}` : ""}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="button"
                      style={{ marginTop: 8, fontSize: 13, padding: "6px 12px" }}
                      disabled={savingId === r.id}
                      onClick={() => void save(r.id)}
                    >
                      {savingId === r.id ? "Saving…" : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
