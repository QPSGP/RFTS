"use client";

import { useEffect, useState } from "react";
import type { EmailStaffListKey } from "@/lib/email-staff-lists";
import { EMAIL_STAFF_LIST_META } from "@/lib/email-staff-lists";

type ListRow = {
  key: EmailStaffListKey;
  emails: string[];
  updatedAt: string | null;
};

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%",
  maxWidth: 360
} as const;

export default function AdminEmailSettings() {
  const [lists, setLists] = useState<Record<EmailStaffListKey, string[]> | null>(null);
  const [draftAdds, setDraftAdds] = useState<Partial<Record<EmailStaffListKey, string>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/email-settings", {
        credentials: "include",
        cache: "no-store"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(typeof data?.error === "string" ? data.error : "Could not load email lists.");
        setStatusType("error");
        setLists(null);
        return;
      }
      const next = {} as Record<EmailStaffListKey, string[]>;
      for (const row of (data.lists || []) as ListRow[]) {
        next[row.key] = [...(row.emails || [])];
      }
      for (const meta of EMAIL_STAFF_LIST_META) {
        if (!next[meta.key]) next[meta.key] = [];
      }
      setLists(next);
    } catch {
      setStatus("Could not load email lists.");
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const addEmail = (key: EmailStaffListKey) => {
    if (!lists) return;
    const raw = (draftAdds[key] || "").trim();
    if (!raw) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      setStatus(`Invalid email: ${raw}`);
      setStatusType("error");
      return;
    }
    const lower = raw.toLowerCase();
    if (lists[key].some((e) => e.toLowerCase() === lower)) {
      setStatus("That address is already on the list.");
      setStatusType("error");
      return;
    }
    setLists({ ...lists, [key]: [...lists[key], raw] });
    setDraftAdds({ ...draftAdds, [key]: "" });
    setStatus(null);
    setStatusType(null);
  };

  const removeEmail = (key: EmailStaffListKey, email: string) => {
    if (!lists) return;
    setLists({
      ...lists,
      [key]: lists[key].filter((e) => e.toLowerCase() !== email.toLowerCase())
    });
  };

  const save = async () => {
    if (!lists) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/email-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lists })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(typeof data?.error === "string" ? data.error : "Save failed.");
        setStatusType("error");
        return;
      }
      const next = {} as Record<EmailStaffListKey, string[]>;
      for (const row of (data.lists || []) as ListRow[]) {
        next[row.key] = [...(row.emails || [])];
      }
      setLists(next);
      setStatus("Email lists saved.");
      setStatusType("success");
    } catch {
      setStatus("Save failed.");
      setStatusType("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h2>Email settings</h2>
        <p>Loading…</p>
      </div>
    );
  }

  if (!lists) {
    return (
      <div className="card">
        <h2>Email settings</h2>
        <p style={{ color: "#b91c1c" }}>{status || "Unable to load."}</p>
        <button type="button" className="button button-secondary" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Email settings</h2>
      <p style={{ color: "#4b5563", marginBottom: 16, lineHeight: 1.5 }}>
        Staff addresses used for welcome CC, issue reports, affiliate notices, and optional BCC.
        Add or remove addresses below, then save. Changes apply to new outbound mail immediately.
      </p>
      <div style={{ display: "grid", gap: 20 }}>
        {EMAIL_STAFF_LIST_META.map((meta) => (
          <div
            key={meta.key}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 14,
              background: "#fafafa"
            }}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>{meta.label}</h3>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>{meta.description}</p>
            {lists[meta.key].length === 0 ? (
              <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 10 }}>No addresses yet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
                {lists[meta.key].map((email) => (
                  <li
                    key={email}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                      flexWrap: "wrap"
                    }}
                  >
                    <code style={{ fontSize: 13 }}>{email}</code>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => removeEmail(meta.key, email)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <input
                type="email"
                style={inputStyle}
                placeholder="name@example.com"
                value={draftAdds[meta.key] || ""}
                onChange={(e) => setDraftAdds({ ...draftAdds, [meta.key]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEmail(meta.key);
                  }
                }}
              />
              <button
                type="button"
                className="button button-secondary"
                onClick={() => addEmail(meta.key)}
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <button type="button" className="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save email lists"}
        </button>
        {status && (
          <span style={{ color: statusType === "error" ? "#b91c1c" : "#059669", fontSize: 14 }}>
            {status}
          </span>
        )}
      </div>
    </div>
  );
}
