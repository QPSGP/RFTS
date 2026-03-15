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
  const [statusType, setStatusType] = useState<"success" | "error" | null>(errorFromUrl ? "error" : null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const logout = async () => {
    await fetch("/api/user/logout", { method: "POST" });
    setStatus("Logged out.");
    setStatusType("success");
    setLoggedIn(false);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus(null);
    setStatusType(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value?.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value;
    if (!email || !password || password.length < 6) {
      setStatus("Please enter a valid email and password (at least 6 characters).");
      setStatusType("error");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/user/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(data?.error || "Invalid credentials. Try again.");
        setStatusType("error");
        return;
      }
      const nextUrl = searchParams.get("next");
      const safeNext = nextUrl && nextUrl.startsWith("/") && !nextUrl.startsWith("//") ? nextUrl : "/play-options";
      setStatus("Signed in. Taking you there…");
      setStatusType("success");
      window.location.href = safeNext;
      return;
    } catch {
      setStatus("Something went wrong. Please try again.");
      setStatusType("error");
    } finally {
      setIsSubmitting(false);
    }
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
          {status && (
            <p className={`status-message status-message--${statusType ?? "success"}`} style={{ marginTop: 12 }} role="status" aria-live="polite">
              {status}
            </p>
          )}
        </div>
      )}
      <div className="card">
        <h2>Member Login</h2>
        <form onSubmit={handleLogin} className="grid" noValidate>
          <div>
            <label htmlFor="member-login-email" className="sr-only">Email</label>
            <input
              id="member-login-email"
              name="email"
              placeholder="Email"
              type="email"
              required
              autoComplete="email"
              style={inputStyle}
              aria-describedby={status && statusType === "error" ? "member-login-status" : undefined}
            />
            <p style={{ marginTop: 6, marginBottom: 0 }}>
              <a href="/member/forgot-email" style={{ fontSize: 13, color: "#0f766e" }}>
                Forgot email?
              </a>
            </p>
          </div>
          <div style={{ position: "relative" }}>
            <label htmlFor="member-login-password" className="sr-only">Password</label>
            <input
              id="member-login-password"
              name="password"
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              style={{ ...inputStyle, paddingRight: 56 }}
              aria-describedby={status && statusType === "error" ? "member-login-status" : undefined}
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
          <button
            className="button"
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>
          New to RFTS? <a href="/signup/step-1-subscription-selection">Sign up here</a>.
        </p>
      </div>
      {!loggedIn && status && (
        <p id="member-login-status" className={`status-message status-message--${statusType ?? "error"}`} style={{ marginTop: 12 }} role="alert" aria-live="polite">
          {status}
        </p>
      )}
    </div>
  );
}
