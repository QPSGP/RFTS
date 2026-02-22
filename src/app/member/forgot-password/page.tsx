"use client";

import Link from "next/link";
import { useState } from "react";
import SiteFooter from "@/components/SiteFooter";

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%",
  maxWidth: 320
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/member/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "If that email is on file, we sent a reset link. Check your inbox.");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Try again or contact us.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Try again or contact us.");
    }
  };

  return (
    <main>
      <section className="hero section">
        <span className="pill">Member Access</span>
        <h1>Forgot your password?</h1>
        <p>
          We can help you get back into your Reach For The Stars account.
        </p>
      </section>
      <section className="section">
        <div className="card">
          <h2>Reset your password</h2>
          <p style={{ marginBottom: 16 }}>
            Enter the email you use to sign in. We’ll send you a link to set a new password.
          </p>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              disabled={status === "loading"}
            />
            <button className="button" type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Sending…" : "Send reset link"}
            </button>
          </form>
          {message && (
            <p style={{ marginTop: 16, color: status === "error" ? "#b91c1c" : "#166534" }}>
              {message}
            </p>
          )}
          <p style={{ marginTop: 24 }}>
            <Link className="button button-secondary" href="/member/login">
              Back to login
            </Link>
          </p>
          <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            Need help? Email{" "}
            <a href="mailto:customerservice@reachforthestars.today">customerservice@reachforthestars.today</a>
            {" "}or call <a href="tel:+18004625669">800-GOAL-NOW (462-5669)</a>.
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
