"use client";

import { useState } from "react";

export default function LoginForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      <h2>Admin / Facilitator Login</h2>
      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>What Facilitators do</h3>
        <div className="stack">
          <p>Contribute new recordings and ideas.</p>
          <p>Refine descriptions and goal mappings.</p>
          <p>Collaborate on member growth experiences.</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="grid">
        <input
          name="email"
          placeholder="Email"
          type="email"
          required
          style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
        />
        <div style={{ position: "relative" }}>
          <input
            name="password"
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            required
            style={{
              padding: 12,
              paddingRight: 56,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              width: "100%"
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              padding: 4,
              fontSize: 13,
              color: "#64748b",
              cursor: "pointer",
              textDecoration: "underline"
            }}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <p style={{ marginTop: 6, marginBottom: 0 }}>
          <a href="/login/forgot-password" style={{ fontSize: 13, color: "#0f766e" }}>
            Forgot password?
          </a>
        </p>
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
