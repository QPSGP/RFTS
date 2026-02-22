"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import SiteFooter from "@/components/SiteFooter";

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%",
  maxWidth: 320
};

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
          style={inputStyle}
          disabled={status === "loading"}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={6}
          required
          style={inputStyle}
          disabled={status === "loading"}
        />
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
