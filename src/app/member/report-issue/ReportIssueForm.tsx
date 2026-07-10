"use client";

import { put } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import {
  formatReportIssueAttachmentTypes,
  formatReportIssueMaxAttachmentSizeMb,
  isReportIssueAttachmentType,
  isReportIssueImageType,
  REPORT_ISSUE_ATTACHMENT_ACCEPT,
  REPORT_ISSUE_MAX_ATTACHMENT_BYTES,
  REPORT_ISSUE_MAX_ATTACHMENTS,
  REPORT_ISSUE_UPLOAD_PATH_PREFIX
} from "@/lib/report-issue-attachments";
import { collectClientDiagnosticContext } from "@/lib/report-issue-context";

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

type ReportIssueFormProps = {
  /** Admin console: posts to admin API and queues for other admins. */
  mode?: "member" | "admin";
  onSubmitted?: () => void;
};

type AttachmentPreview = {
  file: File;
  previewUrl: string | null;
};

function sanitizePathSegment(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "attachment";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReportIssueForm({
  mode = "member",
  onSubmitted
}: ReportIssueFormProps) {
  const isAdminMode = mode === "admin";
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<AttachmentPreview[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const previews = attachmentFiles.map((file) => ({
      file,
      previewUrl: isReportIssueImageType(file.type) ? URL.createObjectURL(file) : null
    }));
    setAttachmentPreviews(previews);
    return () => {
      previews.forEach((preview) => {
        if (preview.previewUrl) URL.revokeObjectURL(preview.previewUrl);
      });
    };
  }, [attachmentFiles]);

  const clearAttachments = () => {
    setAttachmentFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachmentFiles((current) => current.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onAttachmentsChange = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const errors: string[] = [];
    const next = [...attachmentFiles];
    for (const file of Array.from(fileList)) {
      if (next.length >= REPORT_ISSUE_MAX_ATTACHMENTS) {
        errors.push(`You can attach up to ${REPORT_ISSUE_MAX_ATTACHMENTS} files.`);
        break;
      }
      if (!isReportIssueAttachmentType(file.type)) {
        errors.push(`"${file.name}" must be ${formatReportIssueAttachmentTypes()}.`);
        continue;
      }
      if (file.size > REPORT_ISSUE_MAX_ATTACHMENT_BYTES) {
        errors.push(
          `"${file.name}" must be ${formatReportIssueMaxAttachmentSizeMb()} MB or smaller.`
        );
        continue;
      }
      next.push(file);
    }
    if (errors.length) {
      setStatus(errors[0]);
      setStatusType("error");
    } else {
      setStatus(null);
      setStatusType(null);
    }
    setAttachmentFiles(next.slice(0, REPORT_ISSUE_MAX_ATTACHMENTS));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadAttachment = async (file: File): Promise<string | null> => {
    const ext = file.name.match(/\.[^.]+$/)?.[0] || ".bin";
    const pathname = `${REPORT_ISSUE_UPLOAD_PATH_PREFIX}${Date.now()}-${sanitizePathSegment(file.name.replace(/\.[^.]+$/, ""))}${ext}`;
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
          : "Could not upload attachment. You can send the report without it."
      );
    }
    const clientToken = tokenData?.clientToken;
    if (!clientToken) {
      throw new Error("Could not upload attachment. You can send the report without it.");
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
      const attachmentUrls: string[] = [];
      for (const file of attachmentFiles) {
        try {
          const url = await uploadAttachment(file);
          if (url) attachmentUrls.push(url);
        } catch (uploadErr) {
          const uploadMsg =
            uploadErr instanceof Error ? uploadErr.message : "Attachment upload failed.";
          setStatus(uploadMsg);
          setStatusType("error");
          setIsSubmitting(false);
          return;
        }
      }
      const response = await fetch(
        isAdminMode ? "/api/admin/member-issue-reports" : "/api/member/report-issue",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: subject.trim(),
            message: message.trim(),
            category: category || undefined,
            attachmentUrls: attachmentUrls.length ? attachmentUrls : undefined,
            clientContext: collectClientDiagnosticContext()
          })
        }
      );
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setStatus(
          data?.message ??
            (isAdminMode
              ? "Report filed for other admins to resolve."
              : "Thank you. We received your report.")
        );
        setStatusType("success");
        setSubject("");
        setMessage("");
        setCategory("");
        clearAttachments();
        onSubmitted?.();
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

  const showAttachmentHint =
    category === "technical" || category === "playback" || category === "support";
  const attachmentHint = showAttachmentHint
    ? "For technical or playback issues, a screenshot or short screen recording helps us diagnose the problem faster."
    : `You can attach up to ${REPORT_ISSUE_MAX_ATTACHMENTS} files (${formatReportIssueAttachmentTypes()}, up to ${formatReportIssueMaxAttachmentSizeMb()} MB each).`;

  return (
    <form onSubmit={handleSubmit} className="grid" style={{ gap: 16 }}>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
        {isAdminMode
          ? "This files an internal ticket in the shared admin queue so another admin can resolve it. Browser/device details are attached automatically."
          : "Your account email, membership settings, and browser/device details are attached automatically — you do not need to type those in."}
      </p>
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
        <label htmlFor="report-attachments" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Attachments{" "}
          <span style={{ color: "#64748b", fontWeight: 400 }}>
            (optional, up to {REPORT_ISSUE_MAX_ATTACHMENTS})
          </span>
        </label>
        <input
          id="report-attachments"
          ref={fileInputRef}
          type="file"
          multiple
          accept={REPORT_ISSUE_ATTACHMENT_ACCEPT}
          disabled={attachmentFiles.length >= REPORT_ISSUE_MAX_ATTACHMENTS}
          onChange={(e) => onAttachmentsChange(e.target.files)}
          style={{ ...inputStyle, padding: 8 }}
        />
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          {attachmentHint}
        </p>
        {attachmentPreviews.length ? (
          <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
            {attachmentPreviews.map((preview, index) => (
              <li
                key={`${preview.file.name}-${preview.file.size}-${index}`}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 10
                }}
              >
                {preview.previewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={preview.previewUrl}
                    alt={`Attachment preview ${index + 1}`}
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      maxHeight: 240,
                      borderRadius: 8,
                      marginBottom: 8
                    }}
                  />
                ) : (
                  <p style={{ margin: "0 0 8px", fontSize: 13 }}>
                    Video: {preview.file.name} ({formatFileSize(preview.file.size)})
                  </p>
                )}
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ fontSize: 13, padding: "6px 12px" }}
                  onClick={() => removeAttachment(index)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {attachmentFiles.length ? (
          <button
            type="button"
            className="button button-secondary"
            style={{ marginTop: 8, fontSize: 13, padding: "6px 12px" }}
            onClick={clearAttachments}
          >
            Remove all attachments
          </button>
        ) : null}
      </div>
      <button
        type="submit"
        className="button"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Sending…" : isAdminMode ? "File for other admins" : "Send report"}
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
