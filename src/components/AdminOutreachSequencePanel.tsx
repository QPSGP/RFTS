"use client";

import { useCallback, useEffect, useState } from "react";

type SequenceRow = {
  targetId: string;
  organization: string;
  status: string;
  targetStatus: string;
  doNotEmail: boolean;
  plan: { interest: string; templateName: string; sentAt?: string | null }[];
  nextIndex: number;
  nextSendAt: string | null;
  nextInterest: string | null;
  remaining: number;
  stopReason: string | null;
};

type Props = {
  onOpenCrm?: (targetId: string) => void;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

export default function AdminOutreachSequencePanel({ onOpenCrm }: Props) {
  const [rows, setRows] = useState<SequenceRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing/outreach/nurture", {
        credentials: "include",
        cache: "no-store"
      });
      const data = res.ok ? await res.json() : { sequences: [] };
      setRows(Array.isArray(data.sequences) ? data.sequences : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function post(body: Record<string, unknown>, okMessage: string) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/marketing/outreach/nurture", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.sequences)) setRows(data.sequences);
      if (!res.ok || data.ok === false) {
        setStatus(data.error || data.reason || "Could not update sequences.");
        return;
      }
      setStatus(
        typeof data.enrolled === "number"
          ? `Lined up ${data.enrolled} sequence(s). Skipped ${data.skipped ?? 0}.`
          : okMessage
      );
    } catch {
      setStatus("Could not update sequences.");
    } finally {
      setBusy(false);
    }
  }

  const active = rows.filter((r) => r.status === "active").length;
  const dueNow = rows.filter(
    (r) =>
      r.status === "active" &&
      r.nextSendAt &&
      Date.parse(r.nextSendAt) <= Date.now()
  ).length;

  return (
    <div className="card" style={{ marginTop: 4 }}>
      <p style={{ margin: "0 0 10px", fontSize: 14, color: "#4b5563" }}>
        After a lead is in CRM, we match their checked interests to conversion
        emails. One email goes out each Monday until they convert, opt out, or
        we run out of interests.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          className="button"
          style={{ width: "auto" }}
          disabled={busy}
          onClick={() => void post({ enrollMissing: true }, "Sequences lined up.")}
        >
          Line up sequences for CRM leads
        </button>
        <button
          type="button"
          className="button button-secondary"
          style={{ width: "auto" }}
          disabled={busy}
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "#4b5563" }}>
        {loading
          ? "Loading…"
          : `${active} active · ${dueNow} due now · ${rows.length} total`}
      </p>
      {status ? <p style={{ margin: "0 0 10px", fontSize: 14 }}>{status}</p> : null}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "8px 10px" }}>Person</th>
              <th style={{ padding: "8px 10px" }}>Interests lined up</th>
              <th style={{ padding: "8px 10px" }}>Next email</th>
              <th style={{ padding: "8px 10px" }}>When</th>
              <th style={{ padding: "8px 10px" }}>Status</th>
              <th style={{ padding: "8px 10px" }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.targetId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 10px" }}>{row.organization || "-"}</td>
                <td style={{ padding: "8px 10px", color: "#4b5563" }}>
                  {row.plan.map((s) => s.interest).join(", ") || "-"}
                </td>
                <td style={{ padding: "8px 10px" }}>{row.nextInterest || "-"}</td>
                <td style={{ padding: "8px 10px" }}>{formatWhen(row.nextSendAt)}</td>
                <td style={{ padding: "8px 10px" }}>
                  {row.status}
                  {row.remaining ? ` · ${row.remaining} left` : ""}
                </td>
                <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                  {onOpenCrm ? (
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ width: "auto", padding: "4px 8px", fontSize: 12 }}
                      onClick={() => onOpenCrm(row.targetId)}
                    >
                      CRM
                    </button>
                  ) : null}
                  {row.status === "active" ? (
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{
                        width: "auto",
                        padding: "4px 8px",
                        fontSize: 12,
                        marginLeft: 6
                      }}
                      disabled={busy}
                      onClick={() =>
                        void post(
                          { sendNowTargetId: row.targetId },
                          "Sent this week's interest email."
                        )
                      }
                    >
                      Send now
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 12, color: "#6b7280" }}>
                  No sequences yet. Import or add a lead with checked interests,
                  or click Line up sequences for CRM leads.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
