"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminSectionToggleClass } from "@/components/admin-section-toggle";
import {
  MARKETING_LANDING_LINKS,
  OUTREACH_CATEGORIES,
  OUTREACH_ENTRY_PATHS,
  OUTREACH_PERSONAS,
  OUTREACH_STATUSES,
  REFERENCE_PERSONAS,
  REFERENCE_PLAN_HIGHLIGHTS
} from "@/lib/marketing-reference";

const marketingSections = {
  overview: false,
  blog: false,
  landing: false,
  outreach: false,
  affiliates: false,
  reference: false
} as const;

type MarketingSection = keyof typeof marketingSections;

type Kpis = {
  totalMembers: number;
  activeMemberships: number;
  newThisMonth: number;
  referredSignups: number;
  referredThisMonth: number;
  weeklyActiveListeners: number;
  retentionD7Percent: number | null;
  retentionD7Retained: number;
  retentionD7Eligible: number;
};

type BlogCadence = {
  due: boolean;
  daysSinceLatest: number | null;
  latestPublishedAt: string | null;
  latestTitle: string | null;
  totalPosts: number;
  nextTopic: { label: string; path: string; kind: string };
  signupPath: string;
};

type AffiliateSnapshotRow = {
  code: string;
  name: string;
  signups: number;
  active: number;
};

type OverviewData = {
  kpis: Kpis;
  blogCadence: BlogCadence;
  affiliateSnapshot: AffiliateSnapshotRow[];
  marketingRef: string | null;
};

type OutreachTarget = {
  id: string;
  organization: string;
  category: string | null;
  persona: string | null;
  entryPath: string | null;
  contact: string | null;
  refCode: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const thStyle = { padding: "10px 12px", fontWeight: 600 } as const;
const tdStyle = { padding: "10px 12px", verticalAlign: "top" } as const;
const tdMutedStyle = { padding: "10px 12px", color: "#4b5563", verticalAlign: "top" } as const;

const emptyForm = {
  organization: "",
  category: "",
  persona: "",
  entryPath: "",
  contact: "",
  refCode: "",
  status: "prospect",
  notes: ""
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return "—";
  }
}

export default function AdminMarketing() {
  const [openSections, setOpenSections] = useState(marketingSections);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewStatus, setOverviewStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  const [targets, setTargets] = useState<OutreachTarget[]>([]);
  const [targetsLoaded, setTargetsLoaded] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [outreachStatus, setOutreachStatus] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);

  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/marketing", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setOverview(data);
        setOverviewStatus("ready");
      })
      .catch(() => setOverviewStatus("error"));
    fetch("/api/admin/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "viewed_marketing_console" }),
      credentials: "include"
    }).catch(() => {});
  }, []);

  const loadTargets = useCallback(async () => {
    const res = await fetch("/api/admin/marketing/outreach", {
      credentials: "include",
      cache: "no-store"
    });
    if (res.ok) {
      const data = await res.json();
      setTargets(Array.isArray(data.targets) ? data.targets : []);
    }
    setTargetsLoaded(true);
  }, []);

  useEffect(() => {
    if (openSections.outreach && !targetsLoaded) {
      loadTargets();
    }
  }, [openSections.outreach, targetsLoaded, loadTargets]);

  const toggleSection = (key: MarketingSection, id: string) => {
    setOpenSections((prev) => {
      const nextOpen = !prev[key];
      if (nextOpen) {
        requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return { ...marketingSections, [key]: true };
      }
      return { ...prev, [key]: false };
    });
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const marketingRef = overview?.marketingRef ?? null;

  const buildShareUrl = useCallback(
    (path: string): string => {
      const base = origin || "";
      if (!marketingRef) return `${base}${path}`;
      const joiner = path.includes("?") ? "&" : "?";
      return `${base}${path}${joiner}ref=${encodeURIComponent(marketingRef)}`;
    },
    [origin, marketingRef]
  );

  const copy = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }, []);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
  };

  const submitForm = async () => {
    if (!form.organization.trim()) {
      setOutreachStatus("Organization name is required.");
      return;
    }
    setSaving(true);
    setOutreachStatus(null);
    const payload = {
      organization: form.organization.trim(),
      category: form.category || null,
      persona: form.persona || null,
      entryPath: form.entryPath || null,
      contact: form.contact.trim() || null,
      refCode: form.refCode.trim() || null,
      status: form.status || "prospect",
      notes: form.notes.trim() || null
    };
    const res = await fetch("/api/admin/marketing/outreach", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload)
    });
    setSaving(false);
    if (res.ok) {
      setOutreachStatus(editingId ? "Target updated." : "Target added.");
      resetForm();
      await loadTargets();
    } else {
      const data = await res.json().catch(() => ({}));
      setOutreachStatus(data?.error || "Save failed.");
    }
  };

  const startEdit = (t: OutreachTarget) => {
    setEditingId(t.id);
    setForm({
      organization: t.organization,
      category: t.category ?? "",
      persona: t.persona ?? "",
      entryPath: t.entryPath ?? "",
      contact: t.contact ?? "",
      refCode: t.refCode ?? "",
      status: t.status || "prospect",
      notes: t.notes ?? ""
    });
    requestAnimationFrame(() => {
      document.getElementById("marketing-outreach")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  };

  const changeStatus = async (t: OutreachTarget, status: string) => {
    setTargets((prev) => prev.map((row) => (row.id === t.id ? { ...row, status } : row)));
    await fetch("/api/admin/marketing/outreach", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id: t.id,
        organization: t.organization,
        category: t.category,
        persona: t.persona,
        entryPath: t.entryPath,
        contact: t.contact,
        refCode: t.refCode,
        status,
        notes: t.notes
      })
    }).catch(() => {});
  };

  const removeTarget = async (t: OutreachTarget) => {
    if (!window.confirm(`Delete "${t.organization}" from the outreach tracker?`)) return;
    const res = await fetch(
      `/api/admin/marketing/outreach?id=${encodeURIComponent(t.id)}`,
      { method: "DELETE", credentials: "include" }
    );
    if (res.ok) {
      setTargets((prev) => prev.filter((row) => row.id !== t.id));
      if (editingId === t.id) resetForm();
    }
  };

  const seedStarters = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/marketing/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ seed: true })
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setTargets(Array.isArray(data.targets) ? data.targets : []);
      setOutreachStatus(`Added ${data.added ?? 0} starter target(s).`);
    }
  };

  const filteredTargets = useMemo(
    () =>
      statusFilter === "all"
        ? targets
        : targets.filter((t) => t.status === statusFilter),
    [targets, statusFilter]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of targets) counts[t.status] = (counts[t.status] ?? 0) + 1;
    return counts;
  }, [targets]);

  return (
    <>
      <section style={{ marginBottom: 24 }}>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <button
            type="button"
            className={adminSectionToggleClass(openSections.overview, true)}
            aria-expanded={openSections.overview}
            onClick={() => toggleSection("overview", "marketing-overview")}
          >
            Marketing overview
          </button>
          <button
            type="button"
            className={adminSectionToggleClass(openSections.blog, true)}
            aria-expanded={openSections.blog}
            onClick={() => toggleSection("blog", "marketing-blog")}
          >
            Blog cadence
          </button>
          <button
            type="button"
            className={adminSectionToggleClass(openSections.landing, true)}
            aria-expanded={openSections.landing}
            onClick={() => toggleSection("landing", "marketing-landing")}
          >
            Landing pages &amp; share links
          </button>
          <button
            type="button"
            className={adminSectionToggleClass(openSections.outreach, true)}
            aria-expanded={openSections.outreach}
            onClick={() => toggleSection("outreach", "marketing-outreach")}
          >
            Outreach tracker
          </button>
          <button
            type="button"
            className={adminSectionToggleClass(openSections.affiliates, true)}
            aria-expanded={openSections.affiliates}
            onClick={() => toggleSection("affiliates", "marketing-affiliates")}
          >
            Affiliate snapshot
          </button>
          <button
            type="button"
            className={adminSectionToggleClass(openSections.reference, true)}
            aria-expanded={openSections.reference}
            onClick={() => toggleSection("reference", "marketing-reference")}
          >
            Reference (personas &amp; plan)
          </button>
        </div>
      </section>

      {/* Overview */}
      {openSections.overview && (
        <section id="marketing-overview" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12, fontSize: 18 }}>Marketing overview</h2>
          {overviewStatus === "loading" && <p>Loading…</p>}
          {overviewStatus === "error" && (
            <p style={{ color: "#b91c1c" }}>Could not load marketing metrics.</p>
          )}
          {overview && overviewStatus === "ready" && (
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="card" style={{ borderColor: "#93c5fd", background: "#f8fbff" }}>
                <strong>North Star — Weekly active listeners</strong>
                <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>
                  {overview.kpis.weeklyActiveListeners ?? 0}
                </p>
                <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: 13 }}>
                  Distinct members with a listen or session in the last 7 days.
                </p>
              </div>
              <div className="card" style={{ borderColor: "#93c5fd", background: "#f8fbff" }}>
                <strong>North Star — 7-day retention</strong>
                <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>
                  {overview.kpis.retentionD7Percent != null
                    ? `${overview.kpis.retentionD7Percent}%`
                    : "—"}
                </p>
                <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: 13 }}>
                  {overview.kpis.retentionD7Eligible > 0
                    ? `${overview.kpis.retentionD7Retained} of ${overview.kpis.retentionD7Eligible} members who signed up 7–14 days ago listened around day 7.`
                    : "No cohort yet (needs members who signed up 7–14 days ago)."}
                </p>
              </div>
              <div className="card">
                <strong>Total members</strong>
                <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>
                  {overview.kpis.totalMembers}
                </p>
              </div>
              <div className="card">
                <strong>Active memberships</strong>
                <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>
                  {overview.kpis.activeMemberships}
                </p>
              </div>
              <div className="card">
                <strong>New this month</strong>
                <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>
                  {overview.kpis.newThisMonth}
                </p>
              </div>
              <div className="card">
                <strong>Affiliate-referred signups</strong>
                <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>
                  {overview.kpis.referredSignups}
                </p>
                <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: 13 }}>
                  {overview.kpis.referredThisMonth} this month
                </p>
              </div>
              <div className="card">
                <strong>Marketing referral code</strong>
                <p style={{ fontSize: 20, margin: "4px 0 0", fontWeight: 600 }}>
                  {overview.marketingRef || "Not set"}
                </p>
                <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: 13 }}>
                  {overview.marketingRef
                    ? "Appended as ?ref= on site CTAs and share links."
                    : "Set NEXT_PUBLIC_MARKETING_AFFILIATE_REF in Vercel to attribute organic signups."}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Blog cadence */}
      {openSections.blog && (
        <section id="marketing-blog" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12, fontSize: 18 }}>Blog cadence</h2>
          {overview?.blogCadence ? (
            <div className="card">
              <div
                style={{
                  display: "inline-block",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: overview.blogCadence.due ? "#fee2e2" : "#dcfce7",
                  color: overview.blogCadence.due ? "#991b1b" : "#166534",
                  marginBottom: 12
                }}
              >
                {overview.blogCadence.due
                  ? `Overdue — ${overview.blogCadence.daysSinceLatest ?? "∞"} days since last post`
                  : `On track — ${overview.blogCadence.daysSinceLatest ?? 0} day(s) since last post`}
              </div>
              <p style={{ margin: "0 0 6px" }}>
                <strong>Latest:</strong> {overview.blogCadence.latestTitle || "—"}{" "}
                <span style={{ color: "#6b7280" }}>
                  ({formatDate(overview.blogCadence.latestPublishedAt)})
                </span>
              </p>
              <p style={{ margin: "0 0 6px" }}>
                <strong>Total posts:</strong> {overview.blogCadence.totalPosts}
              </p>
              <p style={{ margin: "0 0 12px" }}>
                <strong>Suggested next topic</strong> ({overview.blogCadence.nextTopic.kind}):{" "}
                {overview.blogCadence.nextTopic.label}{" "}
                <Link href={overview.blogCadence.nextTopic.path} style={{ color: "#2563eb" }}>
                  {overview.blogCadence.nextTopic.path}
                </Link>
              </p>
              <p style={{ margin: 0, color: "#4b5563", fontSize: 13 }}>
                Add the next article in <code>src/lib/blog-posts.ts</code>, then run{" "}
                <code>npm run blog:check-cadence</code>. See{" "}
                <code>docs/BLOG_WEEKLY_CADENCE.md</code>.
              </p>
            </div>
          ) : (
            <p style={{ color: "#6b7280" }}>Open “Marketing overview” first to load metrics.</p>
          )}
        </section>
      )}

      {/* Landing pages */}
      {openSections.landing && (
        <section id="marketing-landing" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12, fontSize: 18 }}>Landing pages &amp; share links</h2>
          <p style={{ color: "#4b5563", marginBottom: 12 }}>
            Copy a shareable link for any page.{" "}
            {marketingRef
              ? `Links include ?ref=${marketingRef} for attribution.`
              : "Set a marketing referral code to attribute these links."}
          </p>
          <p className="admin-table-hint">Swipe sideways for the full link on a small screen.</p>
          <div className="card table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560, fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Page</th>
                  <th className="admin-col-optional" style={thStyle}>Path</th>
                  <th style={thStyle}>Share link</th>
                </tr>
              </thead>
              <tbody>
                {MARKETING_LANDING_LINKS.map((link) => {
                  const url = buildShareUrl(link.path);
                  const key = `landing-${link.path}`;
                  return (
                    <tr key={link.path} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={tdStyle}>{link.group}</td>
                      <td style={tdStyle}>{link.label}</td>
                      <td className="admin-col-optional" style={tdMutedStyle}>{link.path}</td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          className="button button-secondary"
                          style={{ padding: "6px 10px", fontSize: 13, width: "auto" }}
                          onClick={() => copy(key, url)}
                        >
                          {copied === key ? "Copied!" : "Copy link"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Outreach tracker */}
      {openSections.outreach && (
        <section id="marketing-outreach" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12, fontSize: 18 }}>Outreach tracker</h2>
          <p style={{ color: "#4b5563", marginBottom: 12 }}>
            Track prospective partner organizations and their status. Saved to the database.
          </p>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0, fontSize: 16 }}>
              {editingId ? "Edit target" : "Add target"}
            </h3>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Organization *
                <input
                  value={form.organization}
                  onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
                  placeholder="e.g. City Fire Dept. wellness program"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Category
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  <option value="">—</option>
                  {OUTREACH_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Persona
                <select
                  value={form.persona}
                  onChange={(e) => setForm((f) => ({ ...f, persona: e.target.value }))}
                >
                  <option value="">—</option>
                  {OUTREACH_PERSONAS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Entry path
                <select
                  value={form.entryPath}
                  onChange={(e) => setForm((f) => ({ ...f, entryPath: e.target.value }))}
                >
                  <option value="">—</option>
                  {OUTREACH_ENTRY_PATHS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Contact
                <input
                  value={form.contact}
                  onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                  placeholder="Name / email / phone"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Affiliate ref code
                <input
                  value={form.refCode}
                  onChange={(e) => setForm((f) => ({ ...f, refCode: e.target.value }))}
                  placeholder="Issued ?ref= code"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {OUTREACH_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Notes
                <input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Next step, context, etc."
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="button"
                style={{ width: "auto" }}
                disabled={saving}
                onClick={submitForm}
              >
                {editingId ? "Save changes" : "Add target"}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ width: "auto" }}
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
              {targets.length === 0 && (
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ width: "auto" }}
                  disabled={saving}
                  onClick={seedStarters}
                >
                  Add starter targets
                </button>
              )}
            </div>
            {outreachStatus && (
              <p style={{ margin: "10px 0 0", color: "#374151", fontSize: 13 }}>{outreachStatus}</p>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 12
            }}
          >
            <span style={{ fontSize: 13, color: "#4b5563" }}>Filter:</span>
            <button
              type="button"
              className={`button button-secondary${statusFilter === "all" ? " is-open" : ""}`}
              style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
              onClick={() => setStatusFilter("all")}
            >
              All ({targets.length})
            </button>
            {OUTREACH_STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`button button-secondary${statusFilter === s.id ? " is-open" : ""}`}
                style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                onClick={() => setStatusFilter(s.id)}
              >
                {s.label} ({statusCounts[s.id] ?? 0})
              </button>
            ))}
          </div>

          <p className="admin-table-hint">Swipe sideways for more columns on a small screen.</p>
          <div className="card table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720, fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={thStyle}>Organization</th>
                  <th className="admin-col-optional" style={thStyle}>Category</th>
                  <th className="admin-col-optional" style={thStyle}>Persona</th>
                  <th className="admin-col-optional" style={thStyle}>Entry path</th>
                  <th className="admin-col-optional" style={thStyle}>Contact</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTargets.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{t.organization}</div>
                      {t.notes && (
                        <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>{t.notes}</div>
                      )}
                      {t.refCode && (
                        <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                          ref: {t.refCode}
                        </div>
                      )}
                    </td>
                    <td className="admin-col-optional" style={tdMutedStyle}>{t.category || "—"}</td>
                    <td className="admin-col-optional" style={tdMutedStyle}>{t.persona || "—"}</td>
                    <td className="admin-col-optional" style={tdMutedStyle}>{t.entryPath || "—"}</td>
                    <td className="admin-col-optional" style={tdMutedStyle}>{t.contact || "—"}</td>
                    <td style={tdStyle}>
                      <select
                        value={t.status}
                        onChange={(e) => changeStatus(t, e.target.value)}
                        aria-label={`Status for ${t.organization}`}
                      >
                        {OUTREACH_STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="button button-secondary"
                          style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                          onClick={() => startEdit(t)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                          onClick={() => removeTarget(t)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {targetsLoaded && filteredTargets.length === 0 && (
              <p style={{ padding: 16, color: "#6b7280", margin: 0 }}>
                {targets.length === 0
                  ? "No targets yet. Add one above or use “Add starter targets”."
                  : "No targets with this status."}
              </p>
            )}
            {!targetsLoaded && <p style={{ padding: 16, color: "#6b7280", margin: 0 }}>Loading…</p>}
          </div>
        </section>
      )}

      {/* Affiliate snapshot */}
      {openSections.affiliates && (
        <section id="marketing-affiliates" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12, fontSize: 18 }}>Affiliate snapshot</h2>
          <p style={{ color: "#4b5563", marginBottom: 12 }}>
            Signups attributed to each referral code, with active memberships. Manage payouts in the
            Content Console → Affiliate Section.
          </p>
          <div className="card table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420, fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={thStyle}>Referrer</th>
                  <th className="admin-col-optional" style={thStyle}>Code</th>
                  <th style={thStyle}>Signups</th>
                  <th style={thStyle}>Active</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.affiliateSnapshot ?? []).map((row) => (
                  <tr key={row.code} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={tdStyle}>{row.name}</td>
                    <td className="admin-col-optional" style={tdMutedStyle}>{row.code}</td>
                    <td style={tdStyle}>{row.signups}</td>
                    <td style={tdStyle}>{row.active}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {overview && (overview.affiliateSnapshot?.length ?? 0) === 0 && (
              <p style={{ padding: 16, color: "#6b7280", margin: 0 }}>
                No referred signups recorded yet.
              </p>
            )}
            {!overview && <p style={{ padding: 16, color: "#6b7280", margin: 0 }}>Loading…</p>}
          </div>
        </section>
      )}

      {/* Reference */}
      {openSections.reference && (
        <section id="marketing-reference" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12, fontSize: 18 }}>Reference — personas &amp; plan</h2>
          <div className="grid grid-2" style={{ gap: 12, marginBottom: 16 }}>
            {REFERENCE_PERSONAS.map((p) => (
              <div key={p.name} className="card">
                <strong>{p.name}</strong>
                <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>{p.role}</p>
                <p style={{ margin: "8px 0 0", fontSize: 14 }}>{p.snapshot}</p>
                <p style={{ margin: "8px 0 0", fontSize: 14, color: "#374151" }}>
                  <strong>Message:</strong> {p.message}
                </p>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0, fontSize: 16 }}>Marketing plan highlights</h3>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
              {REFERENCE_PLAN_HIGHLIGHTS.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            <p style={{ margin: "12px 0 0", color: "#6b7280", fontSize: 13 }}>
              Full docs: <code>docs/personas.md</code>, <code>docs/marketing-plan.md</code>,{" "}
              <code>docs/target-organizations.md</code>.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
