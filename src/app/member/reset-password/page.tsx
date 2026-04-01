"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense, type CSSProperties } from "react";
import SiteFooter from "@/components/SiteFooter";

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%",
  maxWidth: 320,
  boxSizing: "border-box" as const
};

const passwordFieldWrap: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 320
};

const showHideBtn: CSSProperties = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  padding: 4,
  fontSize: 13,
  color: "#64748b",
  cursor: "pointer",
  textDecoration: "underline"
};

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = (token || tokenFromUrl).trim();
    if (!t) {
      setMessage("Missing reset link. Use the link from your email or request a new one.");
      setStatus("error");
      return;
    }
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      setStatus("error");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords don’t match.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/member/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t, newPassword: password })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Password updated. You can sign in now.");
      } else {
        setStatus("error");
        setMessage(data.error || "Invalid or expired link. Request a new reset.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="card">
        <h2>Password updated</h2>
        <p style={{ color: "#166534" }}>{message}</p>
        <p style={{ marginTop: 24 }}>
          <Link className="button" href="/member/login">Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Set a new password</h2>
      <p style={{ marginBottom: 16 }}>
        Enter your new password below. Use at least 6 characters.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320 }}>
        {!tokenFromUrl && (
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13 }}>Reset token (from email link)</span>
            <input
              type="text"
              placeholder="Paste token from email"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              style={inputStyle}
              disabled={status === "loading"}
            />
          </label>
        )}
        <div style={passwordFieldWrap}>
          <input
            type={showNewPassword ? "text" : "password"}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            autoComplete="new-password"
            style={{ ...inputStyle, paddingRight: 56 }}
            disabled={status === "loading"}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((v) => !v)}
            style={showHideBtn}
            aria-label={showNewPassword ? "Hide new password" : "Show new password"}
          >
            {showNewPassword ? "Hide" : "Show"}
          </button>
        </div>
        <div style={passwordFieldWrap}>
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={6}
            required
            autoComplete="new-password"
            style={{ ...inputStyle, paddingRight: 56 }}
            disabled={status === "loading"}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            style={showHideBtn}
            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
          >
            {showConfirmPassword ? "Hide" : "Show"}
          </button>
        </div>
        <button className="button" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Updating…" : "Update password"}
        </button>
      </form>
      {message && status === "error" && (
        <p style={{ marginTop: 16, color: "#b91c1c" }}>{message}</p>
      )}
      <p style={{ marginTop: 24 }}>
        <Link className="button button-secondary" href="/member/forgot-password">
          Request a new reset link
        </Link>
      </p>
      <p style={{ marginTop: 12 }}>
        <Link className="button button-secondary" href="/member/login">Back to login</Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main>
      <section className="hero section">
        <span className="pill">Member Access</span>
        <h1>Reset your password</h1>
        <p>Set a new password so you can sign in again.</p>
      </section>
      <section className="section">
        <Suspense fallback={<div className="card">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </section>
      <SiteFooter />
    </main>
  );
}
