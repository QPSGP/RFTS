"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type JsonResponse = {
  header: string[];
  rows: string[][];
  rowHighlight: boolean[];
  email: string;
  label: string;
  subscriptionTier: string | null;
  goalsCount: number;
  assignedAudioCount: number;
  playsPerNight: 1 | 2;
  nights: number;
  maxN: number;
  warnings: string[];
};

type ScheduleAlgorithmToolProps = {
  /** Collapse this section in the content console (e.g. parent toggles `scheduleAlgorithm` off). */
  onClose?: () => void;
  /** Prefill member email (e.g. from Admin Members). */
  initialEmail?: string;
  /** Hide the email field and always use `initialEmail`. */
  emailLocked?: boolean;
  /** Nested layout: no outer card, smaller heading. */
  embedded?: boolean;
  /** Run preview once after mount when email is set. */
  autoPreview?: boolean;
};

export default function ScheduleAlgorithmTool({
  onClose,
  initialEmail = "",
  emailLocked = false,
  embedded = false,
  autoPreview = false
}: ScheduleAlgorithmToolProps) {
  const [email, setEmail] = useState(initialEmail);
  const [nights, setNights] = useState(42);
  const [loading, setLoading] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<JsonResponse | null>(null);
  const autoPreviewDone = useRef(false);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  const effectiveEmail = emailLocked ? initialEmail.trim() : email.trim();

  const runJson = useCallback(async () => {
    setError(null);
    setPreview(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/schedule-algorithm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          email: effectiveEmail,
          nights,
          format: "json"
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : `HTTP ${res.status}`);
        return;
      }
      setPreview(data as JsonResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [effectiveEmail, nights]);

  useEffect(() => {
    if (!autoPreview || autoPreviewDone.current || !effectiveEmail) return;
    autoPreviewDone.current = true;
    void runJson();
  }, [autoPreview, effectiveEmail, runJson]);

  const download = useCallback(
    async (format: "csv" | "html") => {
      setError(null);
      setFileBusy(true);
      try {
        const res = await fetch("/api/admin/schedule-algorithm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            email: effectiveEmail,
            nights,
            format
          })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(typeof data?.error === "string" ? data.error : `HTTP ${res.status}`);
          return;
        }
        const blob = await res.blob();
        const dispo = res.headers.get("Content-Disposition") || "";
        const m = /filename="([^"]+)"/.exec(dispo);
        const name = m?.[1] ?? `schedule-algorithm.${format === "csv" ? "csv" : "html"}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Download failed");
      } finally {
        setFileBusy(false);
      }
    },
    [effectiveEmail, nights]
  );

  const HeadingTag = embedded ? "h4" : "h3";

  return (
    <div className={embedded ? undefined : "card"} style={embedded ? undefined : { marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap"
        }}
      >
        <HeadingTag style={{ margin: 0 }}>
          {embedded ? "Schedule algorithm for this member" : "Schedule algorithm (one member)"}
        </HeadingTag>
        {onClose && (
          <button type="button" className="button button-secondary" onClick={onClose}>
            Close
          </button>
        )}
      </div>
      <p style={{ color: "#4b5563", marginTop: 8, fontSize: embedded ? 13 : undefined }}>
        Same schedule as <strong>Tonight&apos;s Audio</strong> in the member app: goals (Gold) or assigned audio
        order (Platinum Managed), including their plays-per-night setting.
      </p>
      <div style={{ display: "grid", gap: 12, maxWidth: 480, marginTop: 12 }}>
        {emailLocked ? (
          <p style={{ margin: 0, fontSize: 14 }}>
            <strong>Member:</strong> {effectiveEmail || "—"}
          </p>
        ) : (
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Member email</span>
            <input
              className="input"
              type="email"
              autoComplete="off"
              placeholder="member@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        )}
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Schedule nights to generate (1–366)</span>
          <input
            className="input"
            type="number"
            min={1}
            max={366}
            value={nights}
            onChange={(e) => setNights(Math.min(366, Math.max(1, parseInt(e.target.value, 10) || 1)))}
          />
        </label>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16, alignItems: "center" }}>
        <button
          type="button"
          className="button"
          disabled={loading || fileBusy || !effectiveEmail}
          onClick={() => void runJson()}
        >
          {loading ? "Running…" : "Preview in admin"}
        </button>
        <button
          type="button"
          className="button button-secondary"
          disabled={loading || fileBusy || !effectiveEmail}
          onClick={() => void download("csv")}
        >
          {fileBusy ? "Preparing…" : "Download CSV"}
        </button>
        <button
          type="button"
          className="button button-secondary"
          disabled={loading || fileBusy || !effectiveEmail}
          onClick={() => void download("html")}
        >
          Download HTML
        </button>
      </div>
      {error && (
        <p style={{ color: "#b91c1c", marginTop: 12, marginBottom: 0 }} role="alert">
          {error}
        </p>
      )}
      {preview && (
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 14, color: "#374151", marginBottom: 8 }}>
            <strong>{preview.label}</strong> — tier: {preview.subscriptionTier ?? "—"} · {preview.playsPerNight}{" "}
            main play(s) per night · {preview.maxN} nights · {preview.goalsCount} goal(s) ·{" "}
            {preview.assignedAudioCount} assigned track(s).{" "}
            <span style={{ color: "#6b7280" }}>Yellow = rotation change that night.</span>
          </p>
          {preview.warnings.length > 0 && (
            <ul style={{ color: "#b45309", margin: "0 0 12px" }}>
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <p className="admin-table-hint">Swipe sideways to see all nights in the schedule preview.</p>
          <div
            className="table-scroll"
            style={{ maxHeight: 480, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}
          >
            <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%", minWidth: 700 }}>
              <thead>
                <tr>
                  {preview.header.map((h) => (
                    <th
                      key={h}
                      style={{
                        position: "sticky",
                        top: 0,
                        background: "#f3f4f6",
                        borderBottom: "1px solid #e5e7eb",
                        padding: "6px 8px",
                        textAlign: "left",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, ri) => (
                  <tr key={ri} style={{ background: preview.rowHighlight[ri] ? "#fef9c3" : undefined }}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          borderBottom: "1px solid #f3f4f6",
                          padding: "4px 8px",
                          verticalAlign: "top"
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
