"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  OUTREACH_CATEGORIES,
  OUTREACH_ENTRY_PATHS,
  OUTREACH_PERSONAS,
  OUTREACH_STATUSES,
  OUTREACH_TARGET_TYPES,
  outreachStatusLabel
} from "@/lib/marketing-reference";

type Suggested = {
  canAutoSetup: boolean;
  templateName: string | null;
  interest: string | null;
  reason: string;
};

type QueryRow = {
  targetId: string;
  organization: string;
  targetType: string;
  category: string | null;
  persona: string | null;
  entryPath: string | null;
  status: string;
  interest: string | null;
  notes: string | null;
  doNotEmail: boolean;
  contactId: string | null;
  contactName: string | null;
  firstName: string | null;
  email: string | null;
  phoneMobile: string | null;
  suggested: Suggested;
};

type Facets = {
  personas: string[];
  categories: string[];
  interests: string[];
  entryPaths: string[];
  statuses: string[];
  tags: string[];
};

type CampaignSummary = {
  id: string;
  name: string;
  templateName: string | null;
  status: string;
  createdAt: string;
  counts: {
    total: number;
    draft: number;
    approved: number;
    sent: number;
    skipped: number;
    error: number;
  };
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
};

type Template = { id: string; name: string };

type QueryState = {
  q: string;
  status: string;
  persona: string;
  category: string;
  interest: string;
  entryPath: string;
  targetType: string;
  doNotEmail: string;
  hasEmail: string;
  tag: string;
};

const emptyQuery: QueryState = {
  q: "",
  status: "all",
  persona: "",
  category: "",
  interest: "",
  entryPath: "",
  targetType: "",
  doNotEmail: "false",
  hasEmail: "true",
  tag: ""
};

const selectStyle = { fontSize: 13, padding: "6px 8px" } as const;
const labelStyle = { display: "flex", flexDirection: "column", gap: 4, fontSize: 13 } as const;

function toApiQuery(q: QueryState) {
  return {
    q: q.q.trim() || undefined,
    status: q.status !== "all" ? q.status : undefined,
    persona: q.persona || undefined,
    category: q.category || undefined,
    interest: q.interest || undefined,
    entryPath: q.entryPath || undefined,
    targetType: q.targetType || undefined,
    doNotEmail: q.doNotEmail === "any" ? undefined : q.doNotEmail === "true",
    hasEmail: q.hasEmail === "any" ? undefined : q.hasEmail === "true",
    tag: q.tag.trim() || undefined
  };
}

type Props = {
  templates: Template[];
  onOpenCrm?: (targetId: string) => void;
};

export default function AdminOutreachCampaignPanel({ templates, onOpenCrm }: Props) {
  const [query, setQuery] = useState<QueryState>(emptyQuery);
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [facets, setFacets] = useState<Facets>({
    personas: [],
    categories: [],
    interests: [],
    entryPaths: [],
    statuses: [],
    tags: []
  });
  const [groups, setGroups] = useState<{ templateName: string; count: number }[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [openCampaignId, setOpenCampaignId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadQuery = useCallback(async (next: QueryState) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const api = toApiQuery(next);
      for (const [key, value] of Object.entries(api)) {
        if (value == null || value === "") continue;
        params.set(key, String(value));
      }
      const res = await fetch(`/api/admin/marketing/crm-query?${params.toString()}`, {
        credentials: "include",
        cache: "no-store"
      });
      const data = res.ok ? await res.json() : { rows: [] };
      setRows(Array.isArray(data.rows) ? data.rows : []);
      if (data.facets) setFacets(data.facets);
      setGroups(Array.isArray(data.groups) ? data.groups : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    const res = await fetch("/api/admin/marketing/outreach/campaigns", {
      credentials: "include",
      cache: "no-store"
    });
    const data = res.ok ? await res.json() : { campaigns: [] };
    setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
  }, []);

  useEffect(() => {
    void loadQuery(emptyQuery);
    void loadCampaigns();
  }, [loadQuery, loadCampaigns]);

  const selectedIds = useMemo(
    () => rows.map((r) => r.contactId).filter((id): id is string => !!id && selected[id]),
    [rows, selected]
  );

  async function createDrafts(from: "selected" | "query") {
    if (from === "selected" && !selectedIds.length) {
      setStatus("Select at least one contact, or use Set up this query.");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const body: Record<string, unknown> = {
        query: toApiQuery(query),
        templateName: templateName || undefined
      };
      if (from === "selected") body.contactIds = selectedIds;
      const res = await fetch("/api/admin/marketing/outreach/campaigns", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.campaigns)) setCampaigns(data.campaigns);
      if (!res.ok) {
        setStatus(data.error || "Could not set up drafts.");
        return;
      }
      const created = Array.isArray(data.created) ? data.created : [];
      const names = created.map((c: { name: string; recipients: number }) => `${c.name} (${c.recipients})`);
      setStatus(
        created.length
          ? `Drafted ${names.join("; ")}. Skipped ${data.skipped ?? 0}${
              data.needsTemplate ? `, ${data.needsTemplate} need a template pick` : ""
            }. Approve below before sending.`
          : `No drafts created. Skipped ${data.skipped ?? 0}. Pick a template for contacts without a matched interest.`
      );
      if (created[0]?.id) {
        setOpenCampaignId(created[0].id);
        await openCampaign(created[0].id);
      }
    } catch {
      setStatus("Could not set up drafts.");
    } finally {
      setBusy(false);
    }
  }

  async function openCampaign(id: string) {
    setOpenCampaignId(id);
    const res = await fetch(`/api/admin/marketing/outreach/campaigns?id=${id}`, {
      credentials: "include",
      cache: "no-store"
    });
    const data = res.ok ? await res.json() : {};
    setRecipients(Array.isArray(data.recipients) ? data.recipients : []);
  }

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
        return;
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
    } catch {
      setStatus("Could not update campaign.");
    } finally {
      setBusy(false);
    }
  }

  const allVisibleSelected =
    rows.filter((r) => r.contactId).length > 0 &&
    rows.every((r) => !r.contactId || selected[r.contactId]);

  const personas = facets.personas.length ? facets.personas : [...OUTREACH_PERSONAS];
  const categories = facets.categories.length ? facets.categories : [...OUTREACH_CATEGORIES];
  const entryPaths = facets.entryPaths.length ? facets.entryPaths : [...OUTREACH_ENTRY_PATHS];

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Query contacts &amp; campaigns</h3>
      <p style={{ margin: "0 0 12px", fontSize: 14, color: "#4b5563" }}>
        Filter by any CRM field, select a group or one person, then set up personalized drafts.
        Approve before send. Converted members and unsubscribes drop out automatically.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 8,
          marginBottom: 10
        }}
      >
        <label style={labelStyle}>
          Search
          <input
            value={query.q}
            onChange={(e) => setQuery((q) => ({ ...q, q: e.target.value }))}
            placeholder="name, email, notes, tags"
            style={selectStyle}
          />
        </label>
        <label style={labelStyle}>
          Status
          <select
            value={query.status}
            onChange={(e) => setQuery((q) => ({ ...q, status: e.target.value }))}
            style={selectStyle}
          >
            <option value="all">All</option>
            <option value="due">Due this week</option>
            {OUTREACH_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Persona
          <select
            value={query.persona}
            onChange={(e) => setQuery((q) => ({ ...q, persona: e.target.value }))}
            style={selectStyle}
          >
            <option value="">Any</option>
            {personas.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Category
          <select
            value={query.category}
            onChange={(e) => setQuery((q) => ({ ...q, category: e.target.value }))}
            style={selectStyle}
          >
            <option value="">Any</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Interest
          <input
            value={query.interest}
            onChange={(e) => setQuery((q) => ({ ...q, interest: e.target.value }))}
            list="crm-interest-facet"
            placeholder="contains…"
            style={selectStyle}
          />
          <datalist id="crm-interest-facet">
            {facets.interests.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </label>
        <label style={labelStyle}>
          Entry path
          <select
            value={query.entryPath}
            onChange={(e) => setQuery((q) => ({ ...q, entryPath: e.target.value }))}
            style={selectStyle}
          >
            <option value="">Any</option>
            {entryPaths.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Type
          <select
            value={query.targetType}
            onChange={(e) => setQuery((q) => ({ ...q, targetType: e.target.value }))}
            style={selectStyle}
          >
            <option value="">Any</option>
            {OUTREACH_TARGET_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Email
          <select
            value={query.hasEmail}
            onChange={(e) => setQuery((q) => ({ ...q, hasEmail: e.target.value }))}
            style={selectStyle}
          >
            <option value="true">Has email</option>
            <option value="any">Any</option>
            <option value="false">Missing email</option>
          </select>
        </label>
        <label style={labelStyle}>
          Do not email
          <select
            value={query.doNotEmail}
            onChange={(e) => setQuery((q) => ({ ...q, doNotEmail: e.target.value }))}
            style={selectStyle}
          >
            <option value="false">Email-ok</option>
            <option value="any">Any</option>
            <option value="true">Do-not-email</option>
          </select>
        </label>
        <label style={labelStyle}>
          Tag / notes
          <input
            value={query.tag}
            onChange={(e) => setQuery((q) => ({ ...q, tag: e.target.value }))}
            list="crm-tag-facet"
            placeholder="ltd, AWeber…"
            style={selectStyle}
          />
          <datalist id="crm-tag-facet">
            {facets.tags.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <button
          type="button"
          className="button"
          style={{ width: "auto" }}
          disabled={loading}
          onClick={() => void loadQuery(query)}
        >
          {loading ? "Searching…" : `Search (${rows.length})`}
        </button>
        <button
          type="button"
          className="button button-secondary"
          style={{ width: "auto" }}
          onClick={() => {
            setQuery(emptyQuery);
            void loadQuery(emptyQuery);
          }}
        >
          Reset
        </button>
      </div>

      {groups.length > 0 ? (
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "#4b5563" }}>
          Ready to auto-draft:{" "}
          {groups.map((g) => `${g.templateName} (${g.count})`).join("; ")}
        </p>
      ) : null}

      <div style={{ overflowX: "auto", marginBottom: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "8px 6px", width: 28 }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) => {
                    const next: Record<string, boolean> = { ...selected };
                    for (const row of rows) {
                      if (row.contactId) next[row.contactId] = e.target.checked;
                    }
                    setSelected(next);
                  }}
                  aria-label="Select all in view"
                />
              </th>
              <th style={{ padding: "8px 6px" }}>Contact</th>
              <th style={{ padding: "8px 6px" }}>Email</th>
              <th style={{ padding: "8px 6px" }}>Interest / process</th>
              <th style={{ padding: "8px 6px" }}>Suggested email</th>
              <th style={{ padding: "8px 6px" }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 200).map((row) => (
              <tr key={row.contactId || row.targetId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 6px" }}>
                  {row.contactId ? (
                    <input
                      type="checkbox"
                      checked={!!selected[row.contactId]}
                      onChange={(e) =>
                        setSelected((prev) => ({ ...prev, [row.contactId as string]: e.target.checked }))
                      }
                      aria-label={`Select ${row.contactName || row.organization}`}
                    />
                  ) : null}
                </td>
                <td style={{ padding: "8px 6px" }}>
                  <strong>{row.contactName || row.organization}</strong>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    {[outreachStatusLabel(row.status), row.persona, row.category]
                      .filter(Boolean)
                      .join(" · ")}
                    {row.doNotEmail ? " · Do not email" : ""}
                  </div>
                </td>
                <td style={{ padding: "8px 6px" }}>{row.email || "-"}</td>
                <td style={{ padding: "8px 6px", color: "#4b5563" }}>{row.interest || "-"}</td>
                <td style={{ padding: "8px 6px", color: "#4b5563" }}>
                  {row.suggested.canAutoSetup
                    ? row.suggested.templateName
                    : row.suggested.reason === "do_not_email"
                      ? "Unsubscribed"
                      : row.suggested.reason === "no_email"
                        ? "No email"
                        : "Pick a template"}
                </td>
                <td style={{ padding: "8px 6px" }}>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 200 ? (
          <p style={{ fontSize: 12, color: "#6b7280" }}>Showing first 200. Narrow the query.</p>
        ) : null}
        {!loading && rows.length === 0 ? (
          <p style={{ padding: 8, color: "#6b7280", margin: 0 }}>No contacts match this query.</p>
        ) : null}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <label style={{ ...labelStyle, minWidth: 220 }}>
          Template override (optional)
          <select
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            style={selectStyle}
          >
            <option value="">Auto from interest / process</option>
            {templates.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button"
          style={{ width: "auto" }}
          disabled={busy}
          onClick={() => void createDrafts("selected")}
        >
          Set up selected ({selectedIds.length})
        </button>
        <button
          type="button"
          className="button button-secondary"
          style={{ width: "auto" }}
          disabled={busy || rows.length === 0}
          onClick={() => void createDrafts("query")}
        >
          Set up this query ({rows.length})
        </button>
      </div>

      <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Campaign drafts</h4>
      {campaigns.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>No campaigns yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {campaigns.map((c) => (
            <div key={c.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <strong style={{ fontSize: 14 }}>{c.name}</strong>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  {c.status.replace(/_/g, " ")} · {c.counts.draft} draft · {c.counts.approved}{" "}
                  approved · {c.counts.sent} sent · {c.counts.skipped} stopped
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ width: "auto", padding: "4px 10px", fontSize: 13 }}
                  onClick={() => {
                    if (openCampaignId === c.id) {
                      setOpenCampaignId(null);
                      setRecipients([]);
                    } else {
                      void openCampaign(c.id);
                    }
                  }}
                >
                  {openCampaignId === c.id ? "Hide drafts" : "Review drafts"}
                </button>
                {c.counts.draft > 0 ? (
                  <button
                    type="button"
                    className="button"
                    style={{ width: "auto", padding: "4px 10px", fontSize: 13 }}
                    disabled={busy}
                    onClick={() =>
                      void patchCampaign(
                        { campaignId: c.id, approveAll: true },
                        `Approved ${c.counts.draft} draft(s).`
                      )
                    }
                  >
                    Approve all
                  </button>
                ) : null}
                {c.counts.approved > 0 || c.status === "ready_to_send" ? (
                  <button
                    type="button"
                    className="button"
                    style={{ width: "auto", padding: "4px 10px", fontSize: 13 }}
                    disabled={busy}
                    onClick={() =>
                      void patchCampaign({ campaignId: c.id, sendAll: true }, "Group send finished.")
                    }
                  >
                    Send approved as group
                  </button>
                ) : null}
                {c.status === "awaiting_approval" || c.status === "draft" ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ width: "auto", padding: "4px 10px", fontSize: 13 }}
                    disabled={busy}
                    onClick={() =>
                      void patchCampaign({ campaignId: c.id, cancel: true }, "Campaign cancelled.")
                    }
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
              {openCampaignId === c.id
                ? recipients.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: "1px solid #f3f4f6",
                        fontSize: 13
                      }}
                    >
                      <div>
                        <strong>{r.email || "No email"}</strong> · {r.status.replace(/_/g, " ")}
                        {r.skipReason ? ` (${r.skipReason})` : ""}
                      </div>
                      <div style={{ color: "#4b5563", marginTop: 4 }}>{r.subject}</div>
                      <pre
                        style={{
                          margin: "6px 0 0",
                          whiteSpace: "pre-wrap",
                          fontFamily: "inherit",
                          fontSize: 12,
                          color: "#4b5563",
                          maxHeight: 120,
                          overflow: "auto"
                        }}
                      >
                        {r.bodyText}
                      </pre>
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        {r.status === "draft" ? (
                          <button
                            type="button"
                            className="button button-secondary"
                            style={{ width: "auto", padding: "4px 8px", fontSize: 12 }}
                            disabled={busy}
                            onClick={() =>
                              void patchCampaign(
                                { campaignId: c.id, approveRecipientId: r.id },
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
                                { campaignId: c.id, sendRecipientId: r.id },
                                "Sent to this contact."
                              )
                            }
                          >
                            Send this one
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                : null}
            </div>
          ))}
        </div>
      )}
      {status ? <p style={{ margin: "10px 0 0", fontSize: 14 }}>{status}</p> : null}
    </div>
  );
}
