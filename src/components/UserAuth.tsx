"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

const inputStyle = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

export default function UserAuth() {
  const searchParams = useSearchParams();
  const errorFromUrl = searchParams.get("error") === "invalid";
  const [status, setStatus] = useState<string | null>(errorFromUrl ? "Invalid credentials. Try again." : null);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submitLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value;
    const res = await fetch("/api/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      await new Promise((r) => setTimeout(r, 2000));
      window.location.href = "/play-options";
      return;
    }
    setStatus("Invalid credentials. Try again.");
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
        <form onSubmit={submitLogin} className="grid">
          <div>
            <input name="email" placeholder="Email" type="email" autoComplete="email" required style={inputStyle} />
            <p style={{ marginTop: 6, marginBottom: 0 }}>
              <a href="/member/forgot-email" style={{ fontSize: 13, color: "#0f766e" }}>
                Forgot email?
              </a>
            </p>
          </div>
          <div style={{ position: "relative" }}>
            <input
              name="password"
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              style={{ ...inputStyle, paddingRight: 56 }}
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
            <a href="/member/forgot-password" style={{ fontSize: 13, color: "#0f766e" }}>
              Forgot password?
            </a>
          </p>
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>
          New to RFTS? <a href="/signup/step-1-subscription-selection">Sign up here</a>.
        </p>
      </div>
      {!loggedIn && status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}
