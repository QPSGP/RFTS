"use client";

import { useEffect, useMemo, useState } from "react";

type AdminAccount = {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  firstName?: string | null;
  lastName?: string | null;
};

type AdminDraft = {
  firstName: string;
  lastName: string;
  newPassword: string;
};

const emptyDraft = (): AdminDraft => ({
  firstName: "",
  lastName: "",
  newPassword: ""
});

export default function AdminAdmins() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, AdminDraft>>({});
  const [savingEmail, setSavingEmail] = useState<string | null>(null);

  const primaryAdminEmail = useMemo(
    () => (admins.length > 0 ? admins[0].email.toLowerCase() : null),
    [admins]
  );

  const load = () => {
    fetch("/api/admin/admins")
      .then((res) => res.json())
      .then((data) => {
        if (data.admins) {
          setAdmins(data.admins);
          setDrafts((prev) => {
            const next: Record<string, AdminDraft> = { ...prev };
            for (const a of data.admins as AdminAccount[]) {
              if (!next[a.email]) {
                next[a.email] = {
                  firstName: a.firstName ?? "",
                  lastName: a.lastName ?? "",
                  newPassword: ""
                };
              } else {
                next[a.email] = {
                  ...next[a.email],
                  firstName: a.firstName ?? next[a.email].firstName,
                  lastName: a.lastName ?? next[a.email].lastName
                };
              }
            }
            return next;
          });
        } else if (data.error) {
          setStatus(`Error: ${data.error}`);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setCreating(true);
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        firstName: createFirstName.trim() || undefined,
        lastName: createLastName.trim() || undefined
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setEmail("");
      setPassword("");
      setCreateFirstName("");
      setCreateLastName("");
      load();
      setStatus("Admin created.");
    } else {
      setStatus(`Error: ${data?.error || "Failed to create admin."}`);
    }
    setCreating(false);
  };

  const saveAdmin = async (adminEmail: string) => {
    const d = drafts[adminEmail] || emptyDraft();
    const pw = d.newPassword.trim();
    const hasPw = pw.length >= 6;
    const fn = d.firstName.trim();
    const ln = d.lastName.trim();
    const orig = admins.find((a) => a.email === adminEmail);
    const fnChanged = fn !== (orig?.firstName ?? "").trim();
    const lnChanged = ln !== (orig?.lastName ?? "").trim();
    if (!hasPw && !fnChanged && !lnChanged) {
      setStatus(
        "Error: Enter a new password (6+ characters) and/or change first or last name, then Save."
      );
      return;
    }
    setStatus(null);
    setSavingEmail(adminEmail);
    const body: Record<string, string | undefined> = { email: adminEmail };
    if (hasPw) body.newPassword = pw;
    if (fnChanged) body.firstName = fn;
    if (lnChanged) body.lastName = ln;
    const res = await fetch("/api/admin/admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setDrafts((prev) => ({
        ...prev,
        [adminEmail]: {
          ...prev[adminEmail],
          newPassword: ""
        }
      }));
      setStatus(`Saved ${adminEmail}.`);
      load();
    } else {
      setStatus(`Error: ${data?.error || "Save failed."}`);
    }
    setSavingEmail(null);
  };

  if (loading) {
    return <div className="card">Loading admins...</div>;
  }

  return (
    <section id="admin-admins" className="card">
      <h2>Administrators</h2>
      <p style={{ color: "#64748b", marginBottom: 16 }}>
        Only the <strong>first</strong> administrator (primary) can manage other admins: create accounts, set
        names, and reset passwords. Passwords cannot be viewed—set a new one when needed.
      </p>
      <form onSubmit={create} className="grid" style={{ maxWidth: 480, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Create admin</h3>
        <input
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="input"
        />
        <input
          type="password"
          placeholder="Password (6+ chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="input"
          autoComplete="new-password"
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="First name (optional)"
            value={createFirstName}
            onChange={(e) => setCreateFirstName(e.target.value)}
            className="input"
            style={{ flex: "1 1 140px" }}
          />
          <input
            type="text"
            placeholder="Last name (optional)"
            value={createLastName}
            onChange={(e) => setCreateLastName(e.target.value)}
            className="input"
            style={{ flex: "1 1 140px" }}
          />
        </div>
        <button className="button" type="submit" disabled={creating}>
          {creating ? "Creating..." : "Create Admin"}
        </button>
      </form>
      {status && (
        <p
          className={`status-message ${status.startsWith("Error:") ? "status-message--error" : "status-message--success"}`}
          style={{ marginBottom: 16 }}
          role="status"
        >
          {status}
        </p>
      )}
      <div>
        <strong>Current admins</strong>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
          Primary admin is the oldest account (first created). Edit profile or set a new password per row.
        </p>
        <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none" }}>
          {admins.map((a) => {
            const d = drafts[a.email] || {
              firstName: a.firstName ?? "",
              lastName: a.lastName ?? "",
              newPassword: ""
            };
            const isPrimary = primaryAdminEmail === a.email.toLowerCase();
            return (
              <li
                key={a.id}
                className="card"
                style={{ marginBottom: 12, background: "#f9fafb" }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <strong>{a.email}</strong>
                  {isPrimary && (
                    <span style={{ fontSize: 12, background: "#0f766e", color: "#fff", padding: "2px 8px", borderRadius: 6 }}>
                      Primary
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{a.status}</span>
                </div>
                <div className="grid" style={{ gap: 8, maxWidth: 480 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      type="text"
                      placeholder="First name"
                      className="input"
                      value={d.firstName}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [a.email]: { ...d, firstName: e.target.value }
                        }))
                      }
                      style={{ flex: "1 1 140px" }}
                    />
                    <input
                      type="text"
                      placeholder="Last name"
                      className="input"
                      value={d.lastName}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [a.email]: { ...d, lastName: e.target.value }
                        }))
                      }
                      style={{ flex: "1 1 140px" }}
                    />
                  </div>
                  <input
                    type="password"
                    placeholder="New password (optional, min 6 characters)"
                    className="input"
                    autoComplete="new-password"
                    value={d.newPassword}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [a.email]: { ...d, newPassword: e.target.value }
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="button"
                    disabled={savingEmail === a.email}
                    onClick={() => saveAdmin(a.email)}
                  >
                    {savingEmail === a.email ? "Saving…" : "Save profile & password"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
