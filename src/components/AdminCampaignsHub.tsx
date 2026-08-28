"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminOutreachCampaignPanel from "@/components/AdminOutreachCampaignPanel";
import {
  CAMPAIGN_FILTERS,
  campaignMatchesFilter,
  campaignNeedsAction,
  campaignStatusLabel,
  campaignStatusTone,
  isAweberCampaignName,
  recipientStatusLabel,
  type CampaignFilterId
} from "@/lib/outreach-campaign-ui";

type CampaignCounts = {
  total: number;
  draft: number;
  approved: number;
  sent: number;
  skipped: number;
  error: number;
};

type CampaignSummary = {
  id: string;
  name: string;
  templateName: string | null;
  status: string;
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
  query: Record<string, unknown>;
  counts: CampaignCounts;
};

type CampaignRecipient = {
  id: string;
  campaignId: string;
  targetId: string;
  contactId: string | null;
  email: string | null;
  subject: string;
  bodyText: string;
  status: string;
  skipReason: string | null;
  sentAt: string | null;
};

type Template = { id: string; name: string };

type RecipientFilter = "all" | "draft" | "approved" | "sent" | "stopped";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

function querySummary(query: Record<string, unknown> | undefined): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === "" || value === false) continue;
    if (value === true) {
      parts.push(key);
      continue;
    }
    parts.push(`${key}: ${String(value)}`);
  }
  return parts.join(" · ");
}

function readUrlState() {
  if (typeof window === "undefined") return { id: null as string | null, showNew: false };
  const params = new URLSearchParams(window.location.search);
  return { id: params.get("id"), showNew: params.get("new") === "1" };
}

function writeUrlState(id: string | null, showNew: boolean) {
  const params = new URLSearchParams();
  if (id) params.set("id", id);
  if (showNew) params.set("new", "1");
  const qs = params.toString();
  window.history.replaceState(null, "", qs ? `/admin/campaigns?${qs}` : "/admin/campaigns");
}

const selectStyle = { fontSize: 13, padding: "6px 8px" } as const;

export default function AdminCampaignsHub() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<CampaignFilterId>("aweber");
  const [search, setSearch] = useState("");
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>("all");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  const selectCampaign = useCallback((id: string | null, nextShowNew = false) => {
    setSelectedId(id);
    setShowNew(nextShowNew);
    setStatus(null);
    setEditingId(null);
    writeUrlState(id, nextShowNew);
  }, []);

  const loadCampaigns = useCallback(async () => {
    const res = await fetch("/api/admin/marketing/outreach/campaigns", {
      credentials: "include",
      cache: "no-store"
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Could not load campaigns.");
    }
    setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
  }, []);

  const openCampaign = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/marketing/outreach/campaigns?id=${id}`, {
        credentials: "include",
        cache: "no-store"
      });
      const data = res.ok ? await res.json() : {};
      setRecipients(Array.isArray(data.recipients) ? data.recipients : []);
      if (data.campaign?.name) setRenameValue(data.campaign.name);
    } catch {
      setRecipients([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const { id, showNew: nextNew } = readUrlState();
    if (id) setSelectedId(id);
    if (nextNew) setShowNew(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setStatus(null);
      try {
        await loadCampaigns();
      } catch (err) {
        if (!cancelled) {
          setCampaigns([]);
          setStatus(err instanceof Error ? err.message : "Could not load campaigns.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCampaigns]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/marketing/outreach-templates", {
      credentials: "include",
      cache: "no-store"
    })
      .then((res) => (res.ok ? res.json() : { templates: [] }))
      .then((tplData) => {
        if (!cancelled) setTemplates(Array.isArray(tplData.templates) ? tplData.templates : []);
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedId) void openCampaign(selectedId);
    else setRecipients([]);
  }, [selectedId, openCampaign]);

  const selected = campaigns.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) setRenameValue(selected.name);
  }, [selected]);

  const counts = useMemo(() => {
    return {
      needsAction: campaigns.filter((c) => campaignNeedsAction(c.status)).length,
      aweber: campaigns.filter((c) => isAweberCampaignName(c.name)).length,
      ready: campaigns.filter((c) => c.status === "ready_to_send").length,
      sent: campaigns.filter((c) => c.status === "completed").length,
      cancelled: campaigns.filter((c) => c.status === "cancelled").length
    };
  }, [campaigns]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (!campaignMatchesFilter(c, filter)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.templateName || "").toLowerCase().includes(q) ||
        (c.createdByEmail || "").toLowerCase().includes(q)
      );
    });
  }, [campaigns, filter, search]);

  async function patchCampaign(body: Record<string, unknown>, okMessage: string) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/marketing/outreach/campaigns", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.campaigns)) setCampaigns(data.campaigns);
      if (Array.isArray(data.recipients)) setRecipients(data.recipients);
      if (!res.ok) {
        setStatus(data.error || "Could not update campaign.");
        return false;
      }
      if (typeof data.sent === "number") {
        setStatus(
          `Sent ${data.sent}, skipped ${data.skipped ?? 0}${
            data.errors?.length ? `. Errors: ${data.errors.join("; ")}` : "."
          }`
        );
      } else {
        setStatus(okMessage);
      }
      return true;
    } catch {
      setStatus("Could not update campaign.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveRename() {
    if (!selected) return;
    const name = renameValue.trim();
    if (!name || name === selected.name) return;
    await patchCampaign({ campaignId: selected.id, name }, "Campaign renamed.");
  }

  async function saveRecipientEdit() {
    if (!selected || !editingId) return;
    const ok = await patchCampaign(
      {
        campaignId: selected.id,
        recipientId: editingId,
        subject: editSubject,
        bodyText: editBody
      },
      "Draft saved."
    );
    if (ok) setEditingId(null);
  }

  const visibleRecipients = recipients.filter((r) => {
    if (recipientFilter === "all") return true;
    if (recipientFilter === "stopped") return r.status.startsWith("skipped_") || r.status === "error";
    return r.status === recipientFilter;
  });

  const filterCounts: Record<CampaignFilterId, number> = {
    needs_action: counts.needsAction,
    aweber: counts.aweber,
    ready: counts.ready,
    sent: counts.sent,
    cancelled: counts.cancelled,
    all: campaigns.length
  };

  return (
    <>
      <div className="grid grid-2" style={{ gap: 12, marginBottom: 16 }}>
        <div className="card">
          <strong>AWeber</strong>
          <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>{counts.aweber}</p>
          <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: 13 }}>
            Imported list campaigns waiting for review.
          </p>
        </div>
        <div className="card">
          <strong>Needs action</strong>
          <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>{counts.needsAction}</p>
          <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: 13 }}>
            Drafts waiting for review, ready to send, or still sending.
          </p>
        </div>
        <div className="card">
          <strong>Ready to send</strong>
          <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>{counts.ready}</p>
        </div>
        <div className="card">
          <strong>Sent</strong>
          <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>{counts.sent}</p>
        </div>
        <div className="card">
          <strong>Cancelled</strong>
          <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>{counts.cancelled}</p>
        </div>
      </div>

      <div className="admin-filter-row">
        {CAMPAIGN_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter === item.id ? "button" : "button button-secondary"}
            style={{ fontSize: 13 }}
            onClick={() => setFilter(item.id)}
          >
            {item.label} ({filterCounts[item.id]})
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search AWeber, name, template, or sender"
          style={{ ...selectStyle, minWidth: 220, flex: "1 1 220px" }}
          aria-label="Search campaigns"
        />
        <button
          type="button"
          className={showNew ? "button" : "button button-secondary"}
          style={{ fontSize: 13 }}
          onClick={() => selectCampaign(selectedId, !showNew)}
        >
          {showNew ? "Hide new campaign" : "New campaign"}
        </button>
      </div>

      {showNew ? (
        <div style={{ marginBottom: 16 }}>
          <AdminOutreachCampaignPanel
            templates={templates}
            hideCampaignList
            onCreated={(id) => {
              void loadCampaigns();
              selectCampaign(id, false);
            }}
          />
        </div>
      ) : null}

      {selectedId ? (
        <section className="card" style={{ marginBottom: 16 }}>
          {!selected && (loading || detailLoading) ? (
            <p style={{ margin: 0, fontSize: 14 }}>Loading campaign…</p>
          ) : null}
          {!selected && !loading && !detailLoading ? (
            <>
              <p style={{ margin: "0 0 8px", fontSize: 14 }}>Campaign not found.</p>
              <button
                type="button"
                className="button button-secondary"
                style={{ width: "auto", padding: "4px 10px", fontSize: 13 }}
                onClick={() => selectCampaign(null, showNew)}
              >
                Back to list
              </button>
            </>
          ) : null}
          {selected ? (
          <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              marginBottom: 8
            }}
          >
            <button
              type="button"
              className="button button-secondary"
              style={{ width: "auto", padding: "4px 10px", fontSize: 13 }}
              onClick={() => selectCampaign(null, showNew)}
            >
              Back to list
            </button>
            <StatusBadge status={selected.status} />
            <span style={{ fontSize: 13, color: "#6b7280" }}>
              {selected.counts.draft} draft · {selected.counts.approved} approved ·{" "}
              {selected.counts.sent} sent · {selected.counts.skipped} stopped
              {selected.counts.error ? ` · ${selected.counts.error} error` : ""}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => void saveRename()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveRename();
                }
              }}
              aria-label="Campaign name"
              style={{ fontSize: 18, fontWeight: 600, padding: "6px 8px", minWidth: 240, flex: "1 1 240px" }}
            />
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#4b5563" }}>
            {selected.templateName || "No template name"} · Created {formatWhen(selected.createdAt)}
            {selected.createdByEmail ? ` by ${selected.createdByEmail}` : ""}
          </p>
          {querySummary(selected.query) ? (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
              Query: {querySummary(selected.query)}
            </p>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {selected.counts.draft > 0 ? (
              <button
                type="button"
                className="button"
                style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}
                disabled={busy}
                onClick={() =>
                  void patchCampaign(
                    { campaignId: selected.id, approveAll: true },
                    `Approved ${selected.counts.draft} draft(s).`
                  )
                }
              >
                Approve all drafts
              </button>
            ) : null}
            {selected.counts.approved > 0 || selected.status === "ready_to_send" ? (
              <button
                type="button"
                className="button"
                style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}
                disabled={busy}
                onClick={() => {
                  if (
                    !window.confirm(
                      `Send ${selected.counts.approved || "the approved"} email(s) now? This cannot be undone.`
                    )
                  ) {
                    return;
                  }
                  void patchCampaign({ campaignId: selected.id, sendAll: true }, "Group send finished.");
                }}
              >
                Send approved as group
              </button>
            ) : null}
            {selected.status === "awaiting_approval" || selected.status === "draft" ? (
              <button
                type="button"
                className="button button-secondary"
                style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}
                disabled={busy}
                onClick={() => void patchCampaign({ campaignId: selected.id, cancel: true }, "Campaign cancelled.")}
              >
                Cancel campaign
              </button>
            ) : null}
          </div>

          <div className="admin-filter-row" style={{ marginTop: 16, marginBottom: 8 }}>
            {(
              [
                ["all", "All"],
                ["draft", "Drafts"],
                ["approved", "Approved"],
                ["sent", "Sent"],
                ["stopped", "Stopped"]
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={recipientFilter === id ? "button" : "button button-secondary"}
                style={{ fontSize: 13, padding: "6px 10px" }}
                onClick={() => setRecipientFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {detailLoading ? <p style={{ fontSize: 14 }}>Loading drafts…</p> : null}
          {!detailLoading && visibleRecipients.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>No recipients in this view.</p>
          ) : null}
          {visibleRecipients.map((r) => {
            const canEdit = r.status === "draft" || r.status === "approved";
            const editing = editingId === r.id;
            return (
              <div
                key={r.id}
                style={{
                  marginTop: 8,
                  paddingTop: 10,
                  borderTop: "1px solid #f3f4f6",
                  fontSize: 13
                }}
              >
                <div>
                  <strong>{r.email || "No email"}</strong> · {recipientStatusLabel(r.status)}
                  {r.skipReason ? ` (${r.skipReason})` : ""}
                  {r.sentAt ? ` · ${formatWhen(r.sentAt)}` : ""}
                </div>
                {editing ? (
                  <>
                    <label style={{ display: "block", marginTop: 8, fontSize: 13 }}>
                      Subject
                      <input
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        style={{ ...selectStyle, display: "block", width: "100%", marginTop: 4 }}
                      />
                    </label>
                    <label style={{ display: "block", marginTop: 8, fontSize: 13 }}>
                      Body
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={12}
                        style={{ ...selectStyle, display: "block", width: "100%", marginTop: 4 }}
                      />
                    </label>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        className="button"
                        style={{ width: "auto", padding: "4px 10px", fontSize: 12 }}
                        disabled={busy}
                        onClick={() => void saveRecipientEdit()}
                      >
                        Save draft
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        style={{ width: "auto", padding: "4px 10px", fontSize: 12 }}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ color: "#4b5563", marginTop: 4 }}>{r.subject}</div>
                    <pre
                      style={{
                        margin: "6px 0 0",
                        whiteSpace: "pre-wrap",
                        fontFamily: "inherit",
                        fontSize: 12,
                        color: "#4b5563",
                        maxHeight: 220,
                        overflow: "auto"
                      }}
                    >
                      {r.bodyText}
                    </pre>
                  </>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                  {canEdit && !editing ? (
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ width: "auto", padding: "4px 8px", fontSize: 12 }}
                      onClick={() => {
                        setEditingId(r.id);
                        setEditSubject(r.subject);
                        setEditBody(r.bodyText);
                      }}
                    >
                      Edit copy
                    </button>
                  ) : null}
                  {r.status === "draft" ? (
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ width: "auto", padding: "4px 8px", fontSize: 12 }}
                      disabled={busy}
                      onClick={() =>
                        void patchCampaign(
                          { campaignId: selected.id, approveRecipientId: r.id },
                          "Draft approved."
                        )
                      }
                    >
                      Approve this one
                    </button>
                  ) : null}
                  {r.status === "draft" || r.status === "approved" ? (
                    <button
                      type="button"
                      className="button"
                      style={{ width: "auto", padding: "4px 8px", fontSize: 12 }}
                      disabled={busy}
                      onClick={() =>
                        void patchCampaign(
                          { campaignId: selected.id, sendRecipientId: r.id },
                          "Sent to this contact."
                        )
                      }
                    >
                      Send this one
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {status ? <p style={{ margin: "12px 0 0", fontSize: 14 }}>{status}</p> : null}
          </>
          ) : null}
        </section>
      ) : (
        <section className="card">
          {loading ? <p style={{ margin: 0, fontSize: 14 }}>Loading campaigns…</p> : null}
          {!loading && filtered.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              {status
                ? status
                : campaigns.length === 0
                  ? "No campaigns yet. Use New campaign to query CRM contacts and set up drafts."
                  : "No campaigns match this filter. Try All or AWeber."}
            </p>
          ) : null}
          {!loading && filtered.length > 0 ? (
            <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "8px 6px" }}>Campaign</th>
                    <th style={{ padding: "8px 6px" }}>Status</th>
                    <th style={{ padding: "8px 6px" }}>Recipients</th>
                    <th className="admin-col-optional" style={{ padding: "8px 6px" }}>
                      Created
                    </th>
                    <th style={{ padding: "8px 6px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 6px" }}>
                        <strong>{c.name}</strong>
                        <div style={{ color: "#6b7280", fontSize: 12 }}>
                          {c.templateName || "Personalized drafts"}
                        </div>
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <StatusBadge status={c.status} />
                      </td>
                      <td style={{ padding: "8px 6px", color: "#4b5563" }}>
                        {c.counts?.total ?? 0} · {c.counts?.draft ?? 0} draft · {c.counts?.approved ?? 0}{" "}
                        approved · {c.counts?.sent ?? 0} sent
                      </td>
                      <td className="admin-col-optional" style={{ padding: "8px 6px", color: "#6b7280" }}>
                        {formatWhen(c.createdAt)}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <button
                          type="button"
                          className="button"
                          style={{ width: "auto", padding: "4px 10px", fontSize: 12 }}
                          onClick={() => selectCampaign(c.id, showNew)}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {status && !selected ? <p style={{ margin: "12px 0 0", fontSize: 14 }}>{status}</p> : null}
        </section>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = campaignStatusTone(status);
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 12,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        background: tone.background,
        color: tone.color
      }}
    >
      {campaignStatusLabel(status)}
    </span>
  );
}
