"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import ReportIssueForm from "@/app/member/report-issue/ReportIssueForm";

type Report = {
  id: string;
  userId: string | null;
  memberEmail: string;
  category: string;
  subject: string;
  message: string;
  screenshotUrl: string | null;
  attachmentUrls: string[];
  status: string;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
};

function isAdminFiled(report: Report): boolean {
  return !report.userId;
}

function isLikelyImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
}

function isLikelyVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [dbWarning, setDbWarning] = useState<string | null>(null);
  const [showFileForm, setShowFileForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setStatusMsg(null);
    setDbWarning(null);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      status: filter
    });
    const res = await fetch(`/api/admin/member-issue-reports?${params.toString()}`, {
      credentials: "include"
    });
    if (res.status === 401) {
      setUnauthorized(true);
      setReports([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (typeof data.dbWarning === "string" && data.dbWarning.trim()) {
      setDbWarning(data.dbWarning.trim());
    }
    const list: Report[] = Array.isArray(data.reports) ? data.reports : [];
    const t = typeof data.total === "number" ? data.total : 0;
    const tp = Math.max(
      1,
      typeof data.totalPages === "number" ? data.totalPages : Math.ceil(t / pageSize) || 1
    );
    setTotal(t);
    setTotalPages(tp);
    if (t > 0 && page > tp) {
      setPage(tp);
      setLoading(false);
      return;
    }
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
  }, [page, pageSize, filter]);

  useEffect(() => {
    fetch("/api/admin/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "viewed_member_issue_reports" }),
      credentials: "include"
    }).catch(() => {});
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#file-issue") {
      setShowFileForm(true);
    }
  }, []);

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
    let msg = "Saved.";
    if (data.adminFiled === true && (d.status === "resolved" || d.status === "closed")) {
      msg += " Internal admin ticket — no member email sent.";
    } else if (data.resolutionEmailSent === true) {
      msg += " Member was emailed about the report status (resolved or closed).";
    } else if (data.resolutionEmailSent === false) {
      msg +=
        " Status saved, but the member notice email did not send (check RESEND_API_KEY / Resend dashboard and server logs).";
    }
    setStatusMsg(msg);
    await load();
  };

  if (unauthorized) {
    return (
      <main>
        <h1>Issue reports</h1>
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
          <h1>Issue reports</h1>
          <p style={{ color: "#4b5563", maxWidth: 640 }}>
            Member reports from <strong>Report an issue</strong>, plus internal tickets filed by
            admins. Update status and resolution notes. When you set a <strong>member</strong> report
            to <strong>Resolved</strong> or <strong>Closed</strong>, the member receives an email with
            your resolution message when provided. Internal admin tickets stay in this queue only (no
            member email).
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="button"
            style={{ fontSize: 13 }}
            onClick={() => setShowFileForm((v) => !v)}
          >
            {showFileForm ? "Hide file form" : "File an issue"}
          </button>
          <button
            type="button"
            className="button button-secondary"
            style={{ fontSize: 13 }}
            onClick={() => void load()}
          >
            Refresh
          </button>
          <Link
            href="/admin/dashboard"
            className="button button-secondary"
            style={{ padding: "8px 12px", fontSize: 13 }}
          >
            Activity Dashboard
          </Link>
          <Link
            href="/admin/content"
            className="button button-secondary"
            style={{ padding: "8px 12px", fontSize: 13 }}
          >
            Content Console
          </Link>
          <AdminLogoutButton />
        </div>
      </section>

      {showFileForm ? (
        <section id="file-issue" className="card" style={{ marginBottom: 24, maxWidth: 560 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>File an issue for other admins</h2>
          <p style={{ color: "#4b5563", fontSize: 14, marginTop: 0 }}>
            Use this for bugs, ops notes, or handoffs. The report is emailed to the team and appears
            in the queue below for another admin to resolve.
          </p>
          <ReportIssueForm
            mode="admin"
            onSubmitted={() => {
              setFilter("open");
              setPage(1);
              void load();
            }}
          />
        </section>
      ) : null}

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
            onClick={() => {
              setFilter(key);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}
      >
        <label style={{ fontSize: 14, color: "#374151", display: "flex", alignItems: "center", gap: 8 }}>
          Per page
          <select
            style={{ padding: 6, borderRadius: 6, border: "1px solid #d1d5db" }}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        {!loading && total > 0 ? (
          <span style={{ fontSize: 14, color: "#64748b" }}>
            {total} report{total === 1 ? "" : "s"} · Page {page} of {totalPages}
          </span>
        ) : null}
      </div>

      {dbWarning && (
        <p className="status-message status-message--error" style={{ marginBottom: 12 }}>
          {dbWarning}
        </p>
      )}

      {statusMsg && (
        <p className="status-message status-message--success" style={{ marginBottom: 12 }}>
          {statusMsg}
        </p>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : total === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "#6b7280" }}>
            {filter === "all"
              ? dbWarning
                ? "Issue reports could not be loaded — see the database message above."
                : "No reports stored yet. Members can submit from Report an issue; admins can use File an issue above."
              : "No reports match this filter."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 720 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>When</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>From</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Category</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Subject</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "10px 8px", fontWeight: 600 }}>Resolution</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb", verticalAlign: "top" }}>
                  <td style={{ padding: "10px 8px", color: "#4b5563", whiteSpace: "nowrap" }}>
                    {formatWhen(r.createdAt)}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    {r.memberEmail}
                    {isAdminFiled(r) ? (
                      <div style={{ fontSize: 12, color: "#0f766e", marginTop: 4 }}>
                        Admin (internal)
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Member</div>
                    )}
                  </td>
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
                      <>
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
                        {(r.attachmentUrls?.length
                          ? r.attachmentUrls
                          : r.screenshotUrl
                            ? [r.screenshotUrl]
                            : []
                        ).length ? (
                          <div style={{ marginTop: 10, maxWidth: 420, display: "grid", gap: 12 }}>
                            {(r.attachmentUrls?.length
                              ? r.attachmentUrls
                              : r.screenshotUrl
                                ? [r.screenshotUrl]
                                : []
                            ).map((url, index) => (
                              <div key={`${r.id}-attachment-${index}`}>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontSize: 13 }}
                                >
                                  View attachment {index + 1}
                                </a>
                                {isLikelyImageUrl(url) ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={url}
                                    alt={`Attachment ${index + 1}`}
                                    style={{
                                      display: "block",
                                      marginTop: 8,
                                      maxWidth: "100%",
                                      maxHeight: 280,
                                      borderRadius: 8,
                                      border: "1px solid #e5e7eb"
                                    }}
                                  />
                                ) : isLikelyVideoUrl(url) ? (
                                  <video
                                    src={url}
                                    controls
                                    style={{
                                      display: "block",
                                      marginTop: 8,
                                      maxWidth: "100%",
                                      maxHeight: 280,
                                      borderRadius: 8,
                                      border: "1px solid #e5e7eb"
                                    }}
                                  />
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </>
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
                          [r.id]: {
                            ...prev[r.id],
                            status: e.target.value,
                            resolutionNotes: prev[r.id]?.resolutionNotes ?? ""
                          }
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
                      placeholder={
                        isAdminFiled(r)
                          ? "How it was resolved (internal notes; no member email)"
                          : "How it was resolved (included in member email when you set status to Resolved)"
                      }
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
                          [r.id]: {
                            ...prev[r.id],
                            status: prev[r.id]?.status ?? r.status,
                            resolutionNotes: e.target.value
                          }
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
          {totalPages > 1 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid #e5e7eb"
              }}
            >
              <button
                type="button"
                className="button button-secondary"
                style={{ fontSize: 13 }}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ fontSize: 14, color: "#64748b" }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="button button-secondary"
                style={{ fontSize: 13 }}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
