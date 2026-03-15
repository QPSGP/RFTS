"use client";

import { useState } from "react";

const inputStyle = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

const CATEGORIES = [
  { value: "", label: "— Select category (optional) —" },
  { value: "technical", label: "Technical / Website" },
  { value: "playback", label: "Playback / Audio" },
  { value: "billing", label: "Billing / Subscription" },
  { value: "content", label: "Content / Library" },
  { value: "other", label: "Other" }
];

export default function ReportIssueForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setStatusType(null);
    if (!subject.trim() || !message.trim()) {
      setStatus("Please enter a subject and message.");
      setStatusType("error");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/member/report-issue", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), category: category || undefined })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setStatus(data?.message ?? "Thank you. We received your report.");
        setStatusType("success");
        setSubject("");
        setMessage("");
        setCategory("");
      } else {
        setStatus(data?.error ?? "Something went wrong. Please try again.");
        setStatusType("error");
      }
    } catch {
      setStatus("Something went wrong. Please try again.");
      setStatusType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid" style={{ gap: 16 }}>
      <div>
        <label htmlFor="report-category" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Category
        </label>
        <select
          id="report-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value || "none"} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="report-subject" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Subject <span style={{ color: "#991b1b" }}>*</span>
        </label>
        <input
          id="report-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of the issue"
          maxLength={200}
          required
          style={inputStyle}
          aria-describedby={status ? "report-status" : undefined}
        />
      </div>
      <div>
        <label htmlFor="report-message" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Message <span style={{ color: "#991b1b" }}>*</span>
        </label>
        <textarea
          id="report-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe what happened, what you expected, and any steps to reproduce."
          rows={5}
          maxLength={5000}
          required
          style={{ ...inputStyle, resize: "vertical" }}
          aria-describedby={status ? "report-status" : undefined}
        />
      </div>
      <button
        type="submit"
        className="button"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Sending…" : "Send report"}
      </button>
      {status && (
        <p
          id="report-status"
          className={`status-message status-message--${statusType ?? "error"}`}
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
      )}
    </form>
  );
}
