"use client";

import { useCallback, useState } from "react";

type JsonResponse = {
  header: string[];
  rows: string[][];
  rowHighlight: boolean[];
  goldEmail: string;
  managedEmail: string;
  goldLabel: string;
  managedLabel: string;
  nights: number;
  maxN: number;
  warnings: string[];
  assignedAudioCount: number;
};

export default function ScheduleAlgorithmTool() {
  const [goldEmail, setGoldEmail] = useState("");
  const [managedEmail, setManagedEmail] = useState("");
  const [nights, setNights] = useState(42);
  const [loading, setLoading] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<JsonResponse | null>(null);

  const runJson = useCallback(async () => {
    setError(null);
    setPreview(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/schedule-algorithm-comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          goldEmail: goldEmail.trim(),
          managedEmail: managedEmail.trim(),
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
  }, [goldEmail, managedEmail, nights]);

  const download = useCallback(
    async (format: "csv" | "html") => {
      setError(null);
      setFileBusy(true);
      try {
        const res = await fetch("/api/admin/schedule-algorithm-comparison", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            goldEmail: goldEmail.trim(),
            managedEmail: managedEmail.trim(),
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
        const name = m?.[1] ?? `schedule-algorithm-comparison.${format === "csv" ? "csv" : "html"}`;
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
    [goldEmail, managedEmail, nights]
  );

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3>Schedule algorithm — Gold vs Platinum Managed</h3>
      <p style={{ color: "#4b5563", marginTop: 8 }}>
        Uses the same code as production: <code>buildSchedulePreview</code> in <code>src/lib/scheduler.ts</code> and the
        same data as the member &quot;Tonight&apos;s Audio&quot; schedule. Compare a <strong>goal-based (Gold)</strong>{" "}
        account to a <strong>Platinum Managed</strong> account with admin-assigned audio order.
      </p>
      <div style={{ display: "grid", gap: 12, maxWidth: 560, marginTop: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Gold (non‑managed) member email</span>
          <input
            className="input"
            type="email"
            autoComplete="off"
            placeholder="e.g. CraigMiloRogers@gmail.com"
            value={goldEmail}
            onChange={(e) => setGoldEmail(e.target.value)}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Platinum Managed member email</span>
          <input
            className="input"
            type="email"
            autoComplete="off"
            placeholder="e.g. terry_bg@msn.com"
            value={managedEmail}
            onChange={(e) => setManagedEmail(e.target.value)}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Number of schedule nights to generate</span>
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
          disabled={loading || fileBusy}
          onClick={() => void runJson()}
        >
          {loading ? "Running…" : "Preview in admin"}
        </button>
        <button
          type="button"
          className="button button-secondary"
          disabled={loading || fileBusy || !goldEmail.trim() || !managedEmail.trim()}
          onClick={() => void download("csv")}
        >
          {fileBusy ? "Preparing…" : "Download CSV"}
        </button>
        <button
          type="button"
          className="button button-secondary"
          disabled={loading || fileBusy || !goldEmail.trim() || !managedEmail.trim()}
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
            <strong>{preview.goldLabel}</strong> · <strong>{preview.managedLabel}</strong> — {preview.maxN} nights,{" "}
            {preview.assignedAudioCount} assigned audios (managed).{" "}
            <span style={{ color: "#6b7280" }}>Yellow rows = rotation change that night.</span>
          </p>
          {preview.warnings.length > 0 && (
            <ul style={{ color: "#b45309", margin: "0 0 12px" }}>
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <div style={{ overflowX: "auto", maxHeight: 480, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%", minWidth: 900 }}>
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
