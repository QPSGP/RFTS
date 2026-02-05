"use client";

import { useEffect, useState } from "react";

type AdminAccount = {
  id: string;
  email: string;
  status: string;
  createdAt: string;
};

export default function AdminAdmins() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => {
    fetch("/api/admin/admins")
      .then((res) => res.json())
      .then((data) => {
        if (data.admins) setAdmins(data.admins);
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
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setEmail("");
      setPassword("");
      load();
      setStatus("Admin created.");
    } else {
      setStatus(data?.error || "Failed to create admin.");
    }
    setCreating(false);
  };

  if (loading) {
    return <div className="card">Loading admins...</div>;
  }

  return (
    <section id="admin-admins" className="card">
      <h2>Administrators</h2>
      <p style={{ color: "#64748b", marginBottom: 16 }}>
        Create new admin accounts. Only the first administrator can access this section.
      </p>
      <form onSubmit={create} className="grid" style={{ maxWidth: 400, marginBottom: 24 }}>
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
        />
        <button className="button" type="submit" disabled={creating}>
          {creating ? "Creating..." : "Create Admin"}
        </button>
      </form>
      {status && (
        <p style={{ marginBottom: 16 }}>{status}</p>
      )}
      <div>
        <strong>Current admins:</strong>
        <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
          {admins.map((a) => (
            <li key={a.id}>{a.email}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
