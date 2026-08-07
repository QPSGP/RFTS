"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EVENT_LEAD_FORM_TYPES,
  EVENT_LEAD_STATUSES,
  LONG_BEACH_EXPO_2026,
  displayLeadName,
  type EventLeadRecord
} from "@/lib/event-leads";

type Props = {
  open: boolean;
};

export default function AdminEventLeadsPanel({ open }: Props) {
  const [leads, setLeads] = useState<EventLeadRecord[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterEventKey, setFilterEventKey] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    setMessage(null);
    const q = filterEventKey.trim()
      ? `?eventKey=${encodeURIComponent(filterEventKey.trim())}`
      : "";
    try {
      const res = await fetch(`/api/admin/marketing/event-leads${q}`, {
        credentials: "include",
        cache: "no-store"
      });
      if (!res.ok) {
        setStatus("error");
        setMessage("Could not load event leads.");
        return;
      }
      const data = await res.json();
      setLeads(data.leads || []);
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage("Could not load event leads.");
    }
  }, [filterEventKey]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const selected = leads.find((l) => l.id === selectedId) || null;

  async function seedSarahRose() {
    setMessage(null);
    const res = await fetch("/api/admin/marketing/event-leads", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seedSarahRose: true })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "Import failed.");
      return;
    }
    setMessage(
      data.alreadyExisted
        ? "Sarah Rose Long Beach Expo lead already in CRM."
        : "Imported Sarah Rose from scan 20260803_124059."
    );
    await load();
    if (data.lead?.id) setSelectedId(data.lead.id);
  }

  async function importExtractsFile() {
    setMessage(null);
    try {
      const extractsRes = await fetch(`/lead-card-extracts/long-beach-2026-08.json`, {
        cache: "no-store"
      });
      if (!extractsRes.ok) {
        setMessage("Extracts file not found at /lead-card-extracts/long-beach-2026-08.json");
        return;
      }
      const dataFile = await extractsRes.json();
      const leads = dataFile.leads || [];
      const res = await fetch("/api/admin/marketing/event-leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importExtracts: true, leads })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Batch import failed.");
        return;
      }
      setMessage(
        `Imported ${data.imported ?? 0}, skipped ${data.skipped ?? 0}, errors ${data.errors ?? 0}.`
      );
      await load();
    } catch {
      setMessage("Batch import failed.");
    }
  }

  async function setLeadStatus(id: string, next: string) {
    const res = await fetch("/api/admin/marketing/event-leads", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next })
    });
    if (res.ok) await load();
  }

  if (!open) return null;

  const practiceUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/lead/practice?key=${encodeURIComponent(LONG_BEACH_EXPO_2026.eventKey)}`
      : `/lead/practice?key=${LONG_BEACH_EXPO_2026.eventKey}`;
  const consumerUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/lead/consumer`
      : "/lead/consumer";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <strong>Digital lead cards (QR / link only)</strong>
        <p style={{ margin: "8px 0", fontSize: 14, color: "#4b5563" }}>
          Not in site nav. Share QR or link at events. Submissions land here and sync to Outreach
          as Chris / Coaches when practice survey defaults apply.
        </p>
        <ul style={{ margin: "8px 0", paddingLeft: 18, fontSize: 14 }}>
          {EVENT_LEAD_FORM_TYPES.map((f) => (
            <li key={f.id}>
              <strong>{f.label}</strong> - <code>{f.path}</code>
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 13, marginBottom: 8 }}>
          Long Beach Expo practice QR target:{" "}
          <a href={practiceUrl} target="_blank" rel="noreferrer">
            {practiceUrl}
          </a>
        </p>
        <p style={{ fontSize: 13, marginBottom: 12 }}>
          Consumer lead form:{" "}
          <a href={consumerUrl} target="_blank" rel="noreferrer">
            {consumerUrl}
          </a>
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="button button-secondary" onClick={() => void load()}>
            Refresh
          </button>
          <button type="button" className="button" onClick={() => void seedSarahRose()}>
            Import Sarah Rose scan (Long Beach Expo)
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => void importExtractsFile()}
          >
            Import extracts JSON batch
          </button>
        </div>
        {message && <p style={{ marginTop: 10, fontSize: 14 }}>{message}</p>}
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <input
            placeholder="Filter event key (optional)"
            value={filterEventKey}
            onChange={(e) => setFilterEventKey(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <button type="button" className="button button-secondary" onClick={() => void load()}>
            Apply filter
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setFilterEventKey(LONG_BEACH_EXPO_2026.eventKey);
            }}
          >
            Long Beach Expo key
          </button>
        </div>

        {status === "loading" && <p>Loading leads…</p>}
        {status === "error" && <p style={{ color: "#b91c1c" }}>{message}</p>}

        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", fontSize: 14 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Event</th>
                <th>Type</th>
                <th>Persona</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>{displayLeadName(lead)}</td>
                  <td>{lead.eventName}</td>
                  <td>{lead.formType}</td>
                  <td>{lead.persona || "-"}</td>
                  <td>{lead.status}</td>
                  <td>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ padding: "4px 8px", fontSize: 12 }}
                      onClick={() => setSelectedId(lead.id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && status !== "loading" && (
                <tr>
                  <td colSpan={6}>No event leads yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="card" id="event-lead-detail">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <strong>Locked digital lead - {displayLeadName(selected)}</strong>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setSelectedId(null)}
            >
              Close
            </button>
          </div>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr",
              gap: "6px 12px",
              fontSize: 14,
              marginTop: 12
            }}
          >
            <dt>Form</dt>
            <dd>{selected.formType}</dd>
            <dt>Event</dt>
            <dd>
              {selected.eventName}
              {selected.eventDates ? ` (${selected.eventDates})` : ""}
            </dd>
            <dt>Event key</dt>
            <dd>
              <code>{selected.eventKey || "-"}</code>
            </dd>
            <dt>Email</dt>
            <dd>{selected.email || "-"}</dd>
            <dt>Mobile</dt>
            <dd>
              {selected.phoneMobile || "-"}
              {selected.smsOk ? " (TXT OK)" : ""}
            </dd>
            <dt>Persona</dt>
            <dd>{selected.persona || "-"}</dd>
            <dt>Category</dt>
            <dd>{selected.category || "-"}</dd>
            <dt>Interest</dt>
            <dd>{selected.interest || "-"}</dd>
            <dt>Entry path</dt>
            <dd>{selected.entryPath || "-"}</dd>
            <dt>Scan</dt>
            <dd>
              <code>{selected.sourceScanPath || "-"}</code>
            </dd>
            <dt>Notes</dt>
            <dd>{selected.notes || "-"}</dd>
            <dt>Auto-reply</dt>
            <dd>{selected.autoReplySentAt || "Not sent"}</dd>
            <dt>Outreach target</dt>
            <dd>
              <code>{selected.outreachTargetId || "-"}</code>
            </dd>
            <dt>Payload</dt>
            <dd>
              <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 12 }}>
                {JSON.stringify(selected.payload, null, 2)}
              </pre>
            </dd>
          </dl>
          <label style={{ display: "block", marginTop: 12 }}>
            Status
            <select
              value={selected.status}
              onChange={(e) => void setLeadStatus(selected.id, e.target.value)}
            >
              {EVENT_LEAD_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
