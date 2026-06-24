"use client";

import { put } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";

const inputStyle = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

const CATEGORIES = [
  { value: "", label: "— Select category (optional) —" },
  { value: "support", label: "Support" },
  { value: "technical", label: "Technical / Website" },
  { value: "playback", label: "Playback / Audio" },
  { value: "billing", label: "Billing / Subscription" },
  { value: "content", label: "Content / Library" },
  { value: "other", label: "Other" }
];

const SCREENSHOT_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

function sanitizePathSegment(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "screenshot";
}

export default function ReportIssueForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!screenshotFile) {
      setScreenshotPreview(null);
      return;
    }
    const url = URL.createObjectURL(screenshotFile);
    setScreenshotPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshotFile]);

  const clearScreenshot = () => {
    setScreenshotFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onScreenshotChange = (file: File | null) => {
    if (!file) {
      clearScreenshot();
      return;
    }
    if (!SCREENSHOT_TYPES.has(file.type)) {
      setStatus("Screenshot must be PNG, JPEG, WebP, or GIF.");
      setStatusType("error");
      clearScreenshot();
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setStatus("Screenshot must be 5 MB or smaller.");
      setStatusType("error");
      clearScreenshot();
      return;
    }
    setStatus(null);
    setStatusType(null);
    setScreenshotFile(file);
  };

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    const ext = file.name.match(/\.[^.]+$/)?.[0] || ".png";
    const pathname = `issue-screenshots/${Date.now()}-${sanitizePathSegment(file.name.replace(/\.[^.]+$/, ""))}${ext}`;
    const tokenRes = await fetch("/api/member/report-issue-screenshot-handler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "blob.generate-client-token",
        payload: { pathname, clientPayload: null, multipart: false }
      }),
      credentials: "include"
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok) {
      throw new Error(
        typeof tokenData?.error === "string"
          ? tokenData.error
          : "Could not upload screenshot. You can send the report without it."
      );
    }
    const clientToken = tokenData?.clientToken;
    if (!clientToken) {
      throw new Error("Could not upload screenshot. You can send the report without it.");
    }
    const blob = await put(pathname, file, {
      access: "public",
      token: clientToken
    });
    return blob?.url || null;
  };

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
      let screenshotUrl: string | undefined;
      if (screenshotFile) {
        try {
          const url = await uploadScreenshot(screenshotFile);
          if (url) screenshotUrl = url;
        } catch (uploadErr) {
          const uploadMsg =
            uploadErr instanceof Error ? uploadErr.message : "Screenshot upload failed.";
          setStatus(uploadMsg);
          setStatusType("error");
          setIsSubmitting(false);
          return;
        }
      }
      const response = await fetch("/api/member/report-issue", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          category: category || undefined,
          screenshotUrl
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setStatus(data?.message ?? "Thank you. We received your report.");
        setStatusType("success");
        setSubject("");
        setMessage("");
        setCategory("");
        clearScreenshot();
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

  const showScreenshotHint =
    category === "technical" || category === "playback" || category === "support";

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
      <div>
        <label htmlFor="report-screenshot" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Screenshot <span style={{ color: "#64748b", fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          id="report-screenshot"
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => onScreenshotChange(e.target.files?.[0] ?? null)}
          style={{ ...inputStyle, padding: 8 }}
        />
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          {showScreenshotHint
            ? "For technical or playback issues, a screenshot of what you see on screen helps us diagnose the problem faster."
            : "You can attach one screenshot (PNG, JPEG, WebP, or GIF, up to 5 MB)."}
        </p>
        {screenshotPreview ? (
          <div style={{ marginTop: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshotPreview}
              alt="Screenshot preview"
              style={{
                maxWidth: "100%",
                maxHeight: 240,
                borderRadius: 8,
                border: "1px solid #e5e7eb"
              }}
            />
            <button
              type="button"
              className="button button-secondary"
              style={{ marginTop: 8, fontSize: 13, padding: "6px 12px" }}
              onClick={clearScreenshot}
            >
              Remove screenshot
            </button>
          </div>
        ) : null}
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
