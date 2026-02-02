"use client";

import { useState } from "react";

const inputStyle = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

export default function UserAuth() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const submit = async (
    event: React.FormEvent<HTMLFormElement>,
    mode: "login" | "signup"
  ) => {
    event.preventDefault();
    setStatus(null);
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      email: formData.get("email"),
      password: formData.get("password")
    };
    const response = await fetch(`/api/user/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      if (mode === "signup") {
        window.location.href = "/goals";
        return;
      }
      setLoggedIn(true);
      setLoading(false);
      setStatus("Signed in.");
      return;
    }
    setStatus(mode === "signup" ? "Sign up failed." : "Login failed.");
    setLoading(false);
  };

  const logout = async () => {
    await fetch("/api/user/logout", { method: "POST" });
    setStatus("Logged out.");
    setLoggedIn(false);
  };

  return (
    <div className="grid grid-2">
      {loggedIn && (
        <div className="card">
          <h2>Quick Start</h2>
          <p>Start your session now or manage your options.</p>
          <div className="cta-row" style={{ marginTop: 12 }}>
            <a
              className="button"
              href="/play-options?autoplay=1#meditation-session"
              style={{ padding: "18px 24px", fontSize: 18, minHeight: 56 }}
            >
              START SESSION
            </a>
            <a
              className="button button-secondary"
              href="/play-options"
              style={{ padding: "18px 24px", fontSize: 18, minHeight: 56 }}
            >
              OPTIONS
            </a>
          </div>
          <button
            className="button button-secondary"
            style={{ marginTop: 12 }}
            onClick={logout}
          >
            Log Out
          </button>
          {status && <p style={{ marginTop: 12 }}>{status}</p>}
        </div>
      )}
      <div className="card">
        <h2>Member Login</h2>
        <form onSubmit={(event) => submit(event, "login")} className="grid">
          <input name="email" placeholder="Email" type="email" required style={inputStyle} />
          <input
            name="password"
            placeholder="Password"
            type="password"
            required
            style={inputStyle}
          />
          <button className="button" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
      <div className="card">
        <h2>Create Account</h2>
        <form onSubmit={(event) => submit(event, "signup")} className="grid">
          <input name="email" placeholder="Email" type="email" required style={inputStyle} />
          <input
            name="password"
            placeholder="Password (6+ chars)"
            type="password"
            required
            style={inputStyle}
          />
          <button className="button" disabled={loading} type="submit">
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
      </div>
      {!loggedIn && (
        <div className="card">
          <h2>Need to log out?</h2>
          <button className="button button-secondary" onClick={logout}>
            Log Out
          </button>
          {status && <p style={{ marginTop: 12 }}>{status}</p>}
        </div>
      )}
    </div>
  );
}
