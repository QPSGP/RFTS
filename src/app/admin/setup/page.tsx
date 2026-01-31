"use client";

import { useEffect, useState } from "react";

const inputStyle = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

export default function AdminSetupPage() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/setup")
      .then((res) => res.json())
      .then((data) => setNeedsSetup(Boolean(data.needsSetup)))
      .catch(() => setNeedsSetup(false));
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      email: formData.get("email"),
      password: formData.get("password"),
      setupToken: formData.get("setupToken") || undefined
    };
    const response = await fetch("/api/admin/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      window.location.href = "/admin/content";
      return;
    }
    const data = await response.json().catch(() => ({}));
    setStatus(data?.error || "Setup failed.");
    setLoading(false);
  };

  if (needsSetup === null) {
    return null;
  }

  if (!needsSetup) {
    return (
      <main>
        <section className="card">
          <h1>Admin Setup</h1>
          <p>Setup is already complete. Please log in at /login.</p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="card">
        <h1>Create Admin Account</h1>
        <p>Set the first admin account for this deployment.</p>
        <form onSubmit={submit} className="grid">
          <input name="email" placeholder="Email" type="email" required style={inputStyle} />
          <input
            name="password"
            placeholder="Password (6+ chars)"
            type="password"
            required
            style={inputStyle}
          />
          <input
            name="setupToken"
            placeholder="Setup token (if required)"
            type="text"
            style={inputStyle}
          />
          <button className="button" disabled={loading} type="submit">
            {loading ? "Creating..." : "Create Admin"}
          </button>
        </form>
        {status && <p style={{ marginTop: 12 }}>{status}</p>}
      </section>
    </main>
  );
}
