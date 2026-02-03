"use client";

import { useState } from "react";

export default function LoginForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      email: formData.get("email"),
      password: formData.get("password")
    };
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      const data = await response.json();
      if (data.role === "moderator") {
        window.location.href = "/moderator/console";
      } else {
        window.location.href = "/admin/content";
      }
      return;
    } else {
      setStatus("Login failed.");
    }
    setIsSubmitting(false);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setStatus("Logged out.");
  };

  return (
    <div className="card">
      <h2>Admin / Collaborator Login</h2>
      <form onSubmit={onSubmit} className="grid">
        <input
          name="email"
          placeholder="Email"
          type="email"
          required
          style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
        />
        <input
          name="password"
          placeholder="Password"
          type="password"
          required
          style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
        />
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <button
        className="button button-secondary"
        style={{ marginTop: 12 }}
        onClick={logout}
      >
        Log Out
      </button>
      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}
