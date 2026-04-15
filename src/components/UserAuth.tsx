"use client";

import { useState } from "react";

const inputStyle = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

function firstQueryString(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

export type UserAuthProps = {
  /** From server `searchParams` — avoids useSearchParams (blank page / stuck Suspense on login). */
  initialErrorInvalid?: boolean;
  initialNextPath?: string;
};

export default function UserAuth({
  initialErrorInvalid = false,
  initialNextPath
}: UserAuthProps) {
  const [status, setStatus] = useState<string | null>(
    initialErrorInvalid ? "Invalid credentials. Try again." : null
  );
  const [statusType, setStatusType] = useState<"success" | "error" | null>(
    initialErrorInvalid ? "error" : null
  );
  const [loggedIn, setLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeNextPath =
    initialNextPath && initialNextPath.startsWith("/") && !initialNextPath.startsWith("//")
      ? initialNextPath
      : "/play-options";

  const logout = async () => {
    await fetch("/api/user/logout", { method: "POST", credentials: "include" });
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
        redirect: "manual",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next: safeNextPath })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(
          data?.error ||
            (response.status === 429
              ? "Too many attempts. Wait a minute and try again."
              : "Invalid credentials. Try again.")
        );
        setStatusType("error");
        return;
      }
      if (!data?.ok) {
        setStatus("Sign-in did not complete. Please try again.");
        setStatusType("error");
        return;
      }
      setStatus("Signed in. Taking you there…");
      setStatusType("success");
      window.location.href = new URL(safeNextPath, window.location.origin).href;
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
            <p
              className={`status-message status-message--${statusType ?? "success"}`}
              style={{ marginTop: 12 }}
              role="status"
              aria-live="polite"
            >
              {status}
            </p>
          )}
        </div>
      )}
      <div className="card">
        <h2>Member Login</h2>
        <form onSubmit={handleLogin} className="grid" noValidate>
          <div>
            <label htmlFor="member-login-email" className="sr-only">
              Email
            </label>
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
            <label htmlFor="member-login-password" className="sr-only">
              Password
            </label>
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
        <p
          id="member-login-status"
          className={`status-message status-message--${statusType ?? "error"}`}
          style={{ marginTop: 12 }}
          role="alert"
          aria-live="polite"
        >
          {status}
        </p>
      )}
    </div>
  );
}
