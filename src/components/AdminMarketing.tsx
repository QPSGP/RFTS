"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { adminSectionToggleClass } from "@/components/admin-section-toggle";
import {
  MARKETING_LANDING_LINKS,
  OUTREACH_CATEGORIES,
  OUTREACH_ENTRY_PATHS,
  OUTREACH_INTERESTS,
  OUTREACH_PERSONAS,
  OUTREACH_STATUSES,
  OUTREACH_TARGET_TYPES,
  REFERENCE_PERSONAS,
  REFERENCE_PLAN_HIGHLIGHTS,
  outreachStatusLabel,
  outreachTargetTypeLabel
} from "@/lib/marketing-reference";
import AdminOutreachCrmPanel from "@/components/AdminOutreachCrmPanel";
import AdminEventLeadsPanel from "@/components/AdminEventLeadsPanel";
import AdminOutreachSequencePanel from "@/components/AdminOutreachSequencePanel";
import AdminOutreachCampaignPanel from "@/components/AdminOutreachCampaignPanel";
import { TERRY_FACILITATOR_REF_CODE } from "@/lib/event-leads";

const marketingSections = {
  overview: false,
  blog: false,
  landing: false,
  leadsOutreach: false,
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
  publishedThisWeek?: number;
  target?: number;
  expectedByToday?: number;
  message?: string;
  weekStartIso?: string;
  weekEndIso?: string;
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
  targetType: string;
  category: string | null;
  persona: string | null;
  entryPath: string | null;
  contact: string | null;
  refCode: string | null;
  status: string;
  notes: string | null;
  interest: string | null;
  audienceSize: string | null;
  decisionTimeline: string | null;
  followUpAt: string | null;
  doNotEmail: boolean;
  createdAt: string;
  updatedAt: string;
};

type OutreachEmailTemplate = {
  id: string;
  name: string;
  subject: string;
  bodyText: string;
  purpose: string | null;
  createdAt: string;
  updatedAt: string;
};

const thStyle = { padding: "10px 12px", fontWeight: 600 } as const;
const tdStyle = { padding: "10px 12px", verticalAlign: "top" } as const;
const tdMutedStyle = { padding: "10px 12px", color: "#4b5563", verticalAlign: "top" } as const;

const emptyForm = {
  targetType: "organization",
  organization: "",
  category: "",
  persona: "",
  entryPath: "",
  contact: "",
  refCode: TERRY_FACILITATOR_REF_CODE,
  status: "prospect",
  notes: "",
  interest: "",
  audienceSize: "",
  decisionTimeline: "",
  followUpAt: "",
  doNotEmail: false
};

const emptyTemplateForm = {
  name: "",
  subject: "",
  bodyText: "",
  purpose: ""
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return "-";
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
  const [crmTargetId, setCrmTargetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [templates, setTemplates] = useState<OutreachEmailTemplate[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [templateForm, setTemplateForm] = useState({ ...emptyTemplateForm });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateStatus, setTemplateStatus] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [copied, setCopied] = useState<string | null>(null);
  type LeadsWizardStep = "add" | "crm" | "sequence" | "tools";
  const [leadsStep, setLeadsStep] = useState<LeadsWizardStep>("add");

  type OutreachSubKey =
    | "eventLeads"
    | "importOutreach"
    | "exportCrm"
    | "emailEvents"
    | "outreachList"
    | "addTarget"
    | "addTemplate"
    | "savedTemplates";
  const [openOutreachSubs, setOpenOutreachSubs] = useState<Record<OutreachSubKey, boolean>>({
    eventLeads: false,
    importOutreach: false,
    exportCrm: false,
    emailEvents: false,
    outreachList: false,
    addTarget: false,
    addTemplate: false,
    savedTemplates: false
  });
  const outreachImportRef = useRef<HTMLInputElement | null>(null);
  const [outreachImportBusy, setOutreachImportBusy] = useState(false);
  const [exportDataset, setExportDataset] = useState("all");
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [exportStatus, setExportStatusFilter] = useState("all");
  const [exportDoNotEmail, setExportDoNotEmail] = useState<"any" | "yes" | "no">("any");
  const [exportEventKey, setExportEventKey] = useState("");
  const [exportQuery, setExportQuery] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  type EmailDeliveryEvent = {
    id: string;
    eventType: string;
    recipientEmail: string | null;
    subject: string | null;
    bounceType: string | null;
    bounceSubtype: string | null;
    message: string | null;
    outreachTargetsUpdated: number;
    createdAt: string;
  };
  const [emailEvents, setEmailEvents] = useState<EmailDeliveryEvent[]>([]);
  const [emailEventsLoaded, setEmailEventsLoaded] = useState(false);

  const toggleOutreachSub = (key: OutreachSubKey) => {
    setOpenOutreachSubs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/admin/marketing/outreach-templates", {
      credentials: "include",
      cache: "no-store"
    });
    if (res.ok) {
      const data = await res.json();
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
    }
    setTemplatesLoaded(true);
  }, []);

  const loadEmailEvents = useCallback(async () => {
    const res = await fetch("/api/admin/marketing/email-events?limit=50", {
      credentials: "include",
      cache: "no-store"
    });
    if (res.ok) {
      const data = await res.json();
      setEmailEvents(Array.isArray(data.events) ? data.events : []);
    }
    setEmailEventsLoaded(true);
  }, []);

  useEffect(() => {
    if (openSections.leadsOutreach && !targetsLoaded) {
      loadTargets();
    }
    if (openSections.leadsOutreach && !templatesLoaded) {
      loadTemplates();
    }
  }, [openSections.leadsOutreach, targetsLoaded, templatesLoaded, loadTargets, loadTemplates]);

  useEffect(() => {
    if (openOutreachSubs.emailEvents) {
      void loadEmailEvents();
    }
  }, [openOutreachSubs.emailEvents, loadEmailEvents]);

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
      setOutreachStatus(
        form.targetType === "individual"
          ? "Person name is required."
          : "Organization name is required."
      );
      return;
    }
    setSaving(true);
    setOutreachStatus(null);
    const payload = {
      targetType: form.targetType === "individual" ? "individual" : "organization",
      organization: form.organization.trim(),
      category: form.category || null,
      persona: form.persona || null,
      entryPath: form.entryPath || null,
      contact: form.contact.trim() || null,
      refCode: form.refCode.trim() || TERRY_FACILITATOR_REF_CODE,
      status: form.status || "prospect",
      notes: form.notes.trim() || null,
      interest: form.interest.trim() || null,
      audienceSize: form.audienceSize.trim() || null,
      decisionTimeline: form.decisionTimeline.trim() || null,
      followUpAt: form.followUpAt || null,
      doNotEmail: !!form.doNotEmail
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
    setOpenOutreachSubs((prev) => ({ ...prev, addTarget: true }));
    setForm({
      targetType: t.targetType === "individual" ? "individual" : "organization",
      organization: t.organization,
      category: t.category ?? "",
      persona: t.persona ?? "",
      entryPath: t.entryPath ?? "",
      contact: t.contact ?? "",
      refCode: t.refCode || TERRY_FACILITATOR_REF_CODE,
      status: t.status || "prospect",
      notes: t.notes ?? "",
      interest: t.interest ?? "",
      audienceSize: t.audienceSize ?? "",
      decisionTimeline: t.decisionTimeline ?? "",
      followUpAt: t.followUpAt ? t.followUpAt.slice(0, 10) : "",
      doNotEmail: !!t.doNotEmail
    });
    requestAnimationFrame(() => {
      document.getElementById("outreach-add-target")?.scrollIntoView({
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
        targetType: t.targetType === "individual" ? "individual" : "organization",
        category: t.category,
        interest: t.interest,
        audienceSize: t.audienceSize,
        decisionTimeline: t.decisionTimeline,
        followUpAt: t.followUpAt,
        doNotEmail: t.doNotEmail,
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
      if (crmTargetId === t.id) setCrmTargetId(null);
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
      setOutreachStatus(
        data.added
          ? `Added ${data.added} starter target(s).`
          : "No new starter targets (all already in the tracker)."
      );
    }
  };

  const importOutreachDatabase = async (file: File) => {
    setOutreachImportBusy(true);
    setOutreachStatus(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/admin/marketing/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ importDatabase: true, text })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOutreachStatus(data.error || "Outreach import failed.");
        return;
      }
      if (Array.isArray(data.targets)) setTargets(data.targets);
      else await loadTargets();
      setOutreachStatus(
        `${[
          `Imported ${data.imported ?? 0}`,
          data.updated ? `updated ${data.updated} already in CRM` : null,
          `skipped ${data.skipped ?? 0}`,
          `errors ${data.errors ?? 0}`
        ]
          .filter(Boolean)
          .join(", ")}. Default ref: ${TERRY_FACILITATOR_REF_CODE}.`
      );
      setOpenOutreachSubs((prev) => ({ ...prev, outreachList: true }));
      if ((data.imported ?? 0) > 0 || (data.updated ?? 0) > 0) setLeadsStep("sequence");
    } catch {
      setOutreachStatus("Outreach import failed.");
    } finally {
      setOutreachImportBusy(false);
      if (outreachImportRef.current) outreachImportRef.current.value = "";
    }
  };

  const triggerDownload = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const filenameFromDisposition = (header: string | null, fallback: string): string => {
    if (!header) return fallback;
    const match = /filename="([^"]+)"/i.exec(header);
    return match?.[1] || fallback;
  };

  const downloadCrmExport = async (params: URLSearchParams): Promise<string> => {
    const res = await fetch(`/api/admin/marketing/crm-export?${params.toString()}`, {
      credentials: "include",
      cache: "no-store"
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(typeof data.error === "string" ? data.error : "Export failed.");
    }
    const format = params.get("format") || "csv";
    const dataset = params.get("dataset") || "all";
    const contentType = res.headers.get("Content-Type") || "";
    if (dataset === "all" && format === "csv" && contentType.includes("application/json")) {
      const data = (await res.json()) as {
        files?: { filename: string; csv: string; rowCount: number }[];
        counts?: { targets?: number; contacts?: number; eventLeads?: number };
      };
      const files = Array.isArray(data.files) ? data.files : [];
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        triggerDownload(file.filename, new Blob([file.csv], { type: "text/csv;charset=utf-8" }));
        if (i < files.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
      const counts = data.counts || {};
      return `Downloaded ${files.length} CSV files (${counts.targets ?? 0} targets, ${counts.contacts ?? 0} contacts, ${counts.eventLeads ?? 0} event leads).`;
    }
    const blob = await res.blob();
    const filename = filenameFromDisposition(
      res.headers.get("Content-Disposition"),
      `rfts-crm-${dataset}.${format}`
    );
    triggerDownload(filename, blob);
    return `Downloaded ${filename}.`;
  };

  const runCrmExport = async (overrides?: Record<string, string>) => {
    setExportBusy(true);
    setExportMessage(null);
    try {
      const params = new URLSearchParams();
      params.set("dataset", overrides?.dataset || exportDataset);
      params.set("format", overrides?.format || exportFormat);
      const status = overrides?.status || exportStatus;
      if (status && status !== "all") params.set("status", status);
      const dne = overrides?.doNotEmail || exportDoNotEmail;
      if (dne === "yes") params.set("doNotEmail", "true");
      if (dne === "no") params.set("doNotEmail", "false");
      const eventKey = overrides?.eventKey ?? exportEventKey;
      if (eventKey.trim()) params.set("eventKey", eventKey.trim());
      const q = overrides?.q ?? exportQuery;
      if (q.trim()) params.set("q", q.trim());
      const message = await downloadCrmExport(params);
      setExportMessage(message);
    } catch (err) {
      setExportMessage(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExportBusy(false);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({ ...emptyTemplateForm });
    setEditingTemplateId(null);
  };

  const submitTemplateForm = async () => {
    if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.bodyText.trim()) {
      setTemplateStatus("Name, subject, and body are required.");
      return;
    }
    setSavingTemplate(true);
    setTemplateStatus(null);
    const payload = {
      name: templateForm.name.trim(),
      subject: templateForm.subject.trim(),
      bodyText: templateForm.bodyText.trim(),
      purpose: templateForm.purpose.trim() || null
    };
    const res = await fetch("/api/admin/marketing/outreach-templates", {
      method: editingTemplateId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(
        editingTemplateId ? { id: editingTemplateId, ...payload } : payload
      )
    });
    setSavingTemplate(false);
    if (res.ok) {
      setTemplateStatus(editingTemplateId ? "Template updated." : "Template added.");
      resetTemplateForm();
      await loadTemplates();
    } else {
      const data = await res.json().catch(() => ({}));
      setTemplateStatus(data?.error || "Save failed.");
    }
  };

  const startEditTemplate = (t: OutreachEmailTemplate) => {
    setEditingTemplateId(t.id);
    setOpenOutreachSubs((prev) => ({ ...prev, addTemplate: true, savedTemplates: true }));
    setTemplateForm({
      name: t.name,
      subject: t.subject,
      bodyText: t.bodyText,
      purpose: t.purpose ?? ""
    });
    requestAnimationFrame(() => {
      document.getElementById("outreach-add-template")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  };

  const removeTemplate = async (t: OutreachEmailTemplate) => {
    if (!window.confirm(`Delete email template "${t.name}"?`)) return;
    const res = await fetch(
      `/api/admin/marketing/outreach-templates?id=${encodeURIComponent(t.id)}`,
      { method: "DELETE", credentials: "include" }
    );
    if (res.ok) {
      setTemplates((prev) => prev.filter((row) => row.id !== t.id));
      if (editingTemplateId === t.id) resetTemplateForm();
    }
  };

  const seedTemplates = async () => {
    setSavingTemplate(true);
    const res = await fetch("/api/admin/marketing/outreach-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ seed: true })
    });
    setSavingTemplate(false);
    if (res.ok) {
      const data = await res.json();
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
      setTemplateStatus(
        data.added
          ? `Added ${data.added} starter template(s).`
          : "No new starter templates (all already saved)."
      );
    }
  };

  const dueSoonCount = useMemo(() => {
    const week = Date.now() + 7 * 86400000;
    return targets.filter((t) => {
      if (!t.followUpAt) return false;
      const ms = Date.parse(t.followUpAt);
      return !Number.isNaN(ms) && ms <= week;
    }).length;
  }, [targets]);

  const filteredTargets = useMemo(() => {
    if (statusFilter === "due") {
      const week = Date.now() + 7 * 86400000;
      return targets.filter((t) => {
        if (!t.followUpAt) return false;
        const ms = Date.parse(t.followUpAt);
        return !Number.isNaN(ms) && ms <= week;
      });
    }
    if (statusFilter === "all") return targets;
    return targets.filter((t) => t.status === statusFilter);
  }, [targets, statusFilter]);

  const crmTarget = useMemo(
    () => (crmTargetId ? targets.find((t) => t.id === crmTargetId) ?? null : null),
    [crmTargetId, targets]
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
            className={adminSectionToggleClass(openSections.leadsOutreach, true)}
            aria-expanded={openSections.leadsOutreach}
            onClick={() => toggleSection("leadsOutreach", "marketing-leads-outreach")}
          >
            Leads &amp; outreach
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
                <strong>North Star - Weekly active listeners</strong>
                <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>
                  {overview.kpis.weeklyActiveListeners ?? 0}
                </p>
                <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: 13 }}>
                  Distinct members with a listen or session in the last 7 days.
                </p>
              </div>
              <div className="card" style={{ borderColor: "#93c5fd", background: "#f8fbff" }}>
                <strong>North Star - 7-day retention</strong>
                <p style={{ fontSize: 24, margin: "4px 0 0", fontWeight: 600 }}>
                  {overview.kpis.retentionD7Percent != null
                    ? `${overview.kpis.retentionD7Percent}%`
                    : "-"}
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
                {overview.blogCadence.message ||
                  (overview.blogCadence.due
                    ? `Late - ${overview.blogCadence.publishedThisWeek ?? "?"}/${overview.blogCadence.target ?? 3} this week`
                    : `On pace - ${overview.blogCadence.publishedThisWeek ?? "?"}/${overview.blogCadence.target ?? 3} this week`)}
              </div>
              <p style={{ margin: "0 0 6px" }}>
                <strong>This week:</strong>{" "}
                {overview.blogCadence.publishedThisWeek ?? "-"}/
                {overview.blogCadence.target ?? 3}
                {overview.blogCadence.weekStartIso
                  ? ` (${overview.blogCadence.weekStartIso} → ${overview.blogCadence.weekEndIso})`
                  : ""}
              </p>
              <p style={{ margin: "0 0 6px" }}>
                <strong>Latest:</strong> {overview.blogCadence.latestTitle || "-"}{" "}
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
                Change wording on existing articles from{" "}
                <Link href="/admin/copy">Page copy</Link>. Add a new article in code (
                <code>src/lib/blog-posts.ts</code>), then run <code>npm run blog:check-cadence</code>.
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

      {/* Leads & outreach (combined) */}
      {openSections.leadsOutreach && (
        <section id="marketing-leads-outreach" style={{ marginBottom: 24, minWidth: 0 }}>
          <h2 style={{ marginBottom: 8, fontSize: 18 }}>Leads &amp; outreach</h2>
          <p style={{ color: "#4b5563", marginBottom: 12, fontSize: 14 }}>
            One step at a time. Import or add a lead, query CRM contacts for a
            campaign, then weekly interest emails until they convert or opt out.
            Manage drafts, approval, and sends on{" "}
            <Link href="/admin/campaigns">Campaigns</Link>.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 16
            }}
          >
            {(
              [
                ["add", "1. Add to CRM"],
                ["crm", "2. Query & campaigns"],
                ["sequence", "3. Weekly emails"],
                ["tools", "Tools"]
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`button${leadsStep === id ? "" : " button-secondary"}`}
                style={{ width: "auto", padding: "8px 12px", fontSize: 13 }}
                onClick={() => {
                  setLeadsStep(id);
                  if (id === "crm") {
                    setOpenOutreachSubs((prev) => ({ ...prev, outreachList: true }));
                  }
                }}
              >
                {label}
              </button>
            ))}
            <Link
              href="/admin/campaigns"
              className="button"
              style={{ width: "auto", padding: "8px 12px", fontSize: 13 }}
            >
              Campaigns
            </Link>
          </div>

          {leadsStep === "add" ? (
            <>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#4b5563" }}>
            Import a file or add a card. Successful rows land in CRM with Terry&apos;s
            referral code <code>{TERRY_FACILITATOR_REF_CODE}</code>, and we line up
            their interest emails automatically.
          </p>
          <div style={{ marginBottom: 12 }}>
            <AdminEventLeadsPanel
              open
              onImported={() => setLeadsStep("sequence")}
            />
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Import outreach database</h3>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#4b5563" }}>
              Upload CSV, TSV, or JSON (name / organization, email, phone, notes, tags).
              AWeber subscriber exports work here. Missing refs get Terry&apos;s code.
              Matching emails update the existing CRM row (unsubscribe becomes do-not-email)
              instead of adding a duplicate. Name-only duplicates without email are skipped.
            </p>
            <input
              ref={outreachImportRef}
              type="file"
              accept=".csv,.tsv,.txt,.json,text/csv,application/json"
              disabled={outreachImportBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importOutreachDatabase(file);
              }}
            />
            {outreachImportBusy ? (
              <p style={{ marginTop: 8, fontSize: 13 }}>Importing…</p>
            ) : null}
            {outreachStatus ? (
              <p style={{ marginTop: 10, fontSize: 14 }}>{outreachStatus}</p>
            ) : null}
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="button"
                style={{ width: "auto" }}
                onClick={() => setLeadsStep("crm")}
              >
                Next: review CRM list
              </button>
            </div>
          </div>
            </>
          ) : null}

          {leadsStep === "sequence" && !crmTarget ? (
            <AdminOutreachSequencePanel
              onOpenCrm={(id) => {
                setCrmTargetId(id);
                setLeadsStep("crm");
              }}
            />
          ) : null}

          {leadsStep === "tools" ? (
            <>
          <div style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={adminSectionToggleClass(openOutreachSubs.exportCrm, true)}
              aria-expanded={openOutreachSubs.exportCrm}
              onClick={() => toggleOutreachSub("exportCrm")}
            >
              {openOutreachSubs.exportCrm ? "▼" : "▶"} Export CRM data
            </button>
            {openOutreachSubs.exportCrm ? (
              <div className="card" style={{ marginTop: 10 }}>
                <p style={{ margin: "0 0 8px", fontSize: 14, color: "#4b5563" }}>
                  Download the live CRM: outreach targets, contacts, activity, event leads, bounce
                  log, and email templates. Use <strong>All CRM</strong> for a full dump,{" "}
                  <strong>Flat contacts</strong> for a spreadsheet of people on each target, or
                  filter by status / search and export that query.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 10,
                    marginBottom: 10
                  }}
                >
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                    Dataset
                    <select
                      value={exportDataset}
                      onChange={(e) => setExportDataset(e.target.value)}
                    >
                      <option value="all">All CRM tables</option>
                      <option value="flat">Flat contacts spreadsheet</option>
                      <option value="targets">Outreach targets</option>
                      <option value="contacts">Contacts</option>
                      <option value="activities">Activity log</option>
                      <option value="event_leads">Event leads</option>
                      <option value="email_events">Email bounces &amp; complaints</option>
                      <option value="templates">Email templates</option>
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                    Format
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as "csv" | "json")}
                    >
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                    Target status
                    <select
                      value={exportStatus}
                      onChange={(e) => setExportStatusFilter(e.target.value)}
                    >
                      <option value="all">All statuses</option>
                      <option value="due">Due this week</option>
                      {OUTREACH_STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                    Do not email
                    <select
                      value={exportDoNotEmail}
                      onChange={(e) =>
                        setExportDoNotEmail(e.target.value as "any" | "yes" | "no")
                      }
                    >
                      <option value="any">Any</option>
                      <option value="yes">Do-not-email only</option>
                      <option value="no">Email-ok only</option>
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                    Event key (event leads)
                    <input
                      value={exportEventKey}
                      onChange={(e) => setExportEventKey(e.target.value)}
                      placeholder="optional"
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                    Search query
                    <input
                      value={exportQuery}
                      onChange={(e) => setExportQuery(e.target.value)}
                      placeholder="name, email, org…"
                    />
                  </label>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    type="button"
                    className="button"
                    style={{ width: "auto" }}
                    disabled={exportBusy}
                    onClick={() => void runCrmExport()}
                  >
                    {exportBusy ? "Exporting…" : "Download export"}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ width: "auto" }}
                    disabled={exportBusy}
                    onClick={() =>
                      void runCrmExport({
                        dataset: "all",
                        format: "json",
                        status: "all",
                        doNotEmail: "any",
                        q: "",
                        eventKey: ""
                      })
                    }
                  >
                    Download all JSON
                  </button>
                </div>
                {exportDataset === "all" && exportFormat === "csv" ? (
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#4b5563" }}>
                    All + CSV downloads one file per table (including the flat contacts sheet).
                    Your browser may ask to allow multiple downloads.
                  </p>
                ) : null}
                {exportMessage ? (
                  <p style={{ marginTop: 10, fontSize: 14 }}>{exportMessage}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={adminSectionToggleClass(openOutreachSubs.emailEvents, true)}
              aria-expanded={openOutreachSubs.emailEvents}
              onClick={() => toggleOutreachSub("emailEvents")}
            >
              {openOutreachSubs.emailEvents ? "▼" : "▶"} Email bounces &amp; complaints
              {emailEventsLoaded ? ` (${emailEvents.length})` : ""}
            </button>
            {openOutreachSubs.emailEvents ? (
              <div className="card" style={{ marginTop: 10 }}>
                <p style={{ margin: "0 0 8px", fontSize: 14, color: "#4b5563" }}>
                  Resend webhook events. Bounces and spam complaints auto-mark matching outreach
                  targets as do-not-email. Configure{" "}
                  <code>RESEND_WEBHOOK_SECRET</code> and point Resend at{" "}
                  <code>/api/webhooks/resend</code>.
                </p>
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ width: "auto", marginBottom: 10 }}
                  onClick={() => void loadEmailEvents()}
                >
                  Refresh
                </button>
                {!emailEventsLoaded ? (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>Loading…</p>
                ) : emailEvents.length === 0 ? (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
                    No bounce or complaint events logged yet.
                  </p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                          <th style={thStyle}>When</th>
                          <th style={thStyle}>Type</th>
                          <th style={thStyle}>Recipient</th>
                          <th style={thStyle}>Subject</th>
                          <th style={thStyle}>Detail</th>
                          <th style={thStyle}>Outreach</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emailEvents.map((ev) => (
                          <tr key={ev.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={tdStyle}>
                              {(() => {
                                try {
                                  return new Date(ev.createdAt).toLocaleString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit"
                                  });
                                } catch {
                                  return formatDate(ev.createdAt);
                                }
                              })()}
                            </td>
                            <td style={tdStyle}>
                              {ev.eventType === "complained" ? "Complaint" : "Bounce"}
                            </td>
                            <td style={tdStyle}>{ev.recipientEmail || "-"}</td>
                            <td style={tdMutedStyle}>{ev.subject || "-"}</td>
                            <td style={tdMutedStyle}>
                              {[ev.bounceType, ev.bounceSubtype, ev.message]
                                .filter(Boolean)
                                .join(" · ") || "-"}
                            </td>
                            <td style={tdStyle}>
                              {ev.outreachTargetsUpdated > 0
                                ? `${ev.outreachTargetsUpdated} marked DNE`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
          </div>
            </>
          ) : null}

          {!crmTarget && leadsStep === "tools" ? (
            <>
          <div id="outreach-add-target" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={adminSectionToggleClass(openOutreachSubs.addTarget, true)}
              aria-expanded={openOutreachSubs.addTarget}
              onClick={() => toggleOutreachSub("addTarget")}
            >
              {openOutreachSubs.addTarget ? "▼" : "▶"}{" "}
              {editingId ? "Edit target" : "Add target"}
            </button>
            {openOutreachSubs.addTarget ? (
          <div className="card" style={{ marginTop: 10, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0, fontSize: 16 }}>
              {editingId ? "Edit target" : "Add target"}
            </h3>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Type *
                <select
                  value={form.targetType}
                  onChange={(e) => {
                    const targetType = e.target.value;
                    setForm((f) => ({
                      ...f,
                      targetType,
                      category:
                        targetType === "individual" && !f.category
                          ? "Individuals & influencers"
                          : f.category
                    }));
                  }}
                >
                  {OUTREACH_TARGET_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                {form.targetType === "individual" ? "Person name *" : "Organization *"}
                <input
                  value={form.organization}
                  onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
                  placeholder={
                    form.targetType === "individual"
                      ? "e.g. Jordan Lee - wellness coach"
                      : "e.g. City Fire Dept. wellness program"
                  }
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Category
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  <option value="">-</option>
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
                  <option value="">-</option>
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
                  <option value="">-</option>
                  {OUTREACH_ENTRY_PATHS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Contact emails
                <input
                  value={form.contact}
                  onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                  placeholder={
                    form.targetType === "individual"
                      ? "person@email.com"
                      : "name@org.org, wellness@org.org"
                  }
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Affiliate / facilitator ref code
                <input
                  value={form.refCode}
                  onChange={(e) => setForm((f) => ({ ...f, refCode: e.target.value }))}
                  placeholder={TERRY_FACILITATOR_REF_CODE}
                />
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  Default: Terry Brussel-Rogers facilitator ({TERRY_FACILITATOR_REF_CODE})
                </span>
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
                Interest
                <select
                  value={form.interest}
                  onChange={(e) => setForm((f) => ({ ...f, interest: e.target.value }))}
                >
                  <option value="">-</option>
                  {OUTREACH_INTERESTS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                {form.targetType === "individual" ? "Reach / following" : "Audience size"}
                <input
                  value={form.audienceSize}
                  onChange={(e) => setForm((f) => ({ ...f, audienceSize: e.target.value }))}
                  placeholder={
                    form.targetType === "individual"
                      ? "e.g. newsletter ~5k, Instagram ~12k"
                      : "e.g. ~200 staff"
                  }
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Decision timeline
                <input
                  value={form.decisionTimeline}
                  onChange={(e) => setForm((f) => ({ ...f, decisionTimeline: e.target.value }))}
                  placeholder="e.g. Q3 budget cycle"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Follow-up date
                <input
                  type="date"
                  value={form.followUpAt}
                  onChange={(e) => setForm((f) => ({ ...f, followUpAt: e.target.value }))}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Notes
                <input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Next step, context, etc."
                />
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  marginTop: 20
                }}
              >
                <input
                  type="checkbox"
                  checked={form.doNotEmail}
                  onChange={(e) => setForm((f) => ({ ...f, doNotEmail: e.target.checked }))}
                />
                Do not email
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
              <button
                type="button"
                className="button button-secondary"
                style={{ width: "auto" }}
                disabled={saving}
                onClick={seedStarters}
              >
                Add missing starter targets
              </button>
            </div>
            {outreachStatus && (
              <p style={{ margin: "10px 0 0", color: "#374151", fontSize: 13 }}>{outreachStatus}</p>
            )}
          </div>
            ) : null}
          </div>

          <div id="outreach-email-templates" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={adminSectionToggleClass(openOutreachSubs.addTemplate, true)}
              aria-expanded={openOutreachSubs.addTemplate}
              onClick={() => toggleOutreachSub("addTemplate")}
            >
              {openOutreachSubs.addTemplate ? "▼" : "▶"}{" "}
              {editingTemplateId ? "Edit email template" : "Add email template"}
            </button>
            {openOutreachSubs.addTemplate ? (
          <div id="outreach-add-template" className="card" style={{ marginTop: 10, marginBottom: 12 }}>
            <h3 style={{ marginTop: 0, fontSize: 16 }}>
              {editingTemplateId ? "Edit email template" : "Add email template"}
            </h3>
            <p style={{ color: "#4b5563", marginTop: 0, marginBottom: 12, fontSize: 13 }}>
              Partner / persona outreach copy. Use <strong>CRM → Send email</strong> to merge and send
              via Resend, or copy into your mail client. Placeholders:{" "}
              <code>{"{{name}}"}</code>, <code>{"{{firstName}}"}</code>,{" "}
              <code>{"{{lastName}}"}</code>, <code>{"{{contactName}}"}</code>,{" "}
              <code>{"{{organization}}"}</code>, <code>{"{{persona}}"}</code>,{" "}
              <code>{"{{siteUrl}}"}</code>.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Template name *
                <input
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Partner / affiliate intro"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Purpose (optional tag)
                <input
                  value={templateForm.purpose}
                  onChange={(e) =>
                    setTemplateForm((f) => ({ ...f, purpose: e.target.value }))
                  }
                  placeholder="partner_intro, new_member, …"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Subject *
                <input
                  value={templateForm.subject}
                  onChange={(e) =>
                    setTemplateForm((f) => ({ ...f, subject: e.target.value }))
                  }
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                Body *
                <textarea
                  value={templateForm.bodyText}
                  onChange={(e) =>
                    setTemplateForm((f) => ({ ...f, bodyText: e.target.value }))
                  }
                  rows={10}
                  style={{ fontFamily: "inherit", resize: "vertical" }}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="button"
                style={{ width: "auto" }}
                disabled={savingTemplate}
                onClick={submitTemplateForm}
              >
                {editingTemplateId ? "Save template" : "Add template"}
              </button>
              {editingTemplateId && (
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ width: "auto" }}
                  onClick={resetTemplateForm}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                className="button button-secondary"
                style={{ width: "auto" }}
                disabled={savingTemplate}
                onClick={seedTemplates}
              >
                Add missing starter templates
              </button>
            </div>
            {templateStatus && (
              <p style={{ margin: "10px 0 0", color: "#374151", fontSize: 13 }}>{templateStatus}</p>
            )}
          </div>
            ) : null}

            <button
              type="button"
              className={adminSectionToggleClass(openOutreachSubs.savedTemplates, true)}
              aria-expanded={openOutreachSubs.savedTemplates}
              onClick={() => toggleOutreachSub("savedTemplates")}
              style={{ marginTop: 8 }}
            >
              {openOutreachSubs.savedTemplates ? "▼" : "▶"} Saved email templates (
              {templatesLoaded ? templates.length : "…"})
            </button>
            {openOutreachSubs.savedTemplates ? (
          <div className="card" style={{ marginTop: 10, marginBottom: 16 }}>
            <p style={{ color: "#4b5563", marginTop: 0, marginBottom: 12, fontSize: 13 }}>
              Persona / partner templates used by <strong>CRM → Send email</strong>. Expand{" "}
              <strong>Add email template</strong> above to create or edit.
            </p>
            {!templatesLoaded && (
              <p style={{ margin: "12px 0 0", color: "#6b7280", fontSize: 13 }}>Loading templates…</p>
            )}
            {templatesLoaded && templates.length === 0 && (
              <p style={{ margin: "12px 0 0", color: "#6b7280", fontSize: 13 }}>
                No templates yet. Expand Add email template and load starters.
              </p>
            )}
            {templates.map((t) => (
              <div
                key={t.id}
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: "1px solid #e5e7eb"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "baseline"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    {t.purpose && (
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{t.purpose}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                      onClick={() => copy(`subj-${t.id}`, t.subject)}
                    >
                      {copied === `subj-${t.id}` ? "Copied" : "Copy subject"}
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                      onClick={() => copy(`body-${t.id}`, t.bodyText)}
                    >
                      {copied === `body-${t.id}` ? "Copied" : "Copy body"}
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                      onClick={() => startEditTemplate(t)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                      onClick={() => removeTemplate(t)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 13, marginTop: 6, color: "#374151" }}>
                  <strong>Subject:</strong> {t.subject}
                </div>
                <pre
                  style={{
                    margin: "8px 0 0",
                    whiteSpace: "pre-wrap",
                    fontSize: 12,
                    color: "#4b5563",
                    fontFamily: "inherit",
                    maxHeight: 160,
                    overflow: "auto"
                  }}
                >
                  {t.bodyText}
                </pre>
              </div>
            ))}
          </div>
            ) : null}
          </div>
            </>
          ) : null}

          {!crmTarget && leadsStep === "crm" ? (
            <>
          <AdminOutreachCampaignPanel
            templates={templates}
            onOpenCrm={(id) => {
              setCrmTargetId(id);
              requestAnimationFrame(() => {
                document.getElementById("outreach-crm-panel")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start"
                });
              });
            }}
          />
          <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Pipeline targets</h3>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#4b5563" }}>
            Same list as before, by pipeline status. Open CRM for the one-person
            capture - process - draft flow.
          </p>
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
            <button
              type="button"
              className={`button button-secondary${statusFilter === "due" ? " is-open" : ""}`}
              style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
              onClick={() => setStatusFilter("due")}
            >
              Due this week ({dueSoonCount})
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

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <button
              type="button"
              className="button button-secondary"
              style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
              disabled={exportBusy}
              onClick={() =>
                void runCrmExport({
                  dataset: "targets",
                  format: "csv",
                  status: statusFilter,
                  doNotEmail: "any",
                  q: "",
                  eventKey: ""
                })
              }
            >
              {exportBusy ? "Exporting…" : `Export this view (${filteredTargets.length})`}
            </button>
          </div>

          <div className="outreach-pipeline-list">
            {filteredTargets.map((t) => (
              <div key={t.id} className="outreach-pipeline-row">
                <div style={{ minWidth: 0 }}>
                  <strong>{t.organization}</strong>
                  <div className="outreach-pipeline-meta">
                    {[
                      outreachTargetTypeLabel(t.targetType || "organization"),
                      t.persona,
                      t.category,
                      t.followUpAt ? `Follow-up ${formatDate(t.followUpAt)}` : null,
                      t.doNotEmail ? "Do not email" : null
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <span className="outreach-pipeline-stage">{outreachStatusLabel(t.status)}</span>
                <div className="outreach-pipeline-actions">
                  <button
                    type="button"
                    className="button"
                    style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}
                    onClick={() => {
                      setCrmTargetId(t.id);
                      requestAnimationFrame(() => {
                        document.getElementById("outreach-crm-panel")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start"
                        });
                      });
                    }}
                  >
                    Open CRM
                  </button>
                  {(t.status === "prospect" || !t.status) ? (
                    <>
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
                    </>
                  ) : null}
                </div>
              </div>
            ))}
            {targetsLoaded && filteredTargets.length === 0 && (
              <p style={{ padding: 8, color: "#6b7280", margin: 0 }}>
                {targets.length === 0
                  ? "No targets yet. Add one above or use “Add missing starter targets”."
                  : "No targets with this status."}
              </p>
            )}
            {!targetsLoaded && <p style={{ padding: 8, color: "#6b7280", margin: 0 }}>Loading…</p>}
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="button"
              style={{ width: "auto" }}
              onClick={() => setLeadsStep("sequence")}
            >
              Next: weekly emails
            </button>
          </div>
            </>
          ) : null}

          <div id="outreach-crm-panel">
            {crmTarget ? (
              <AdminOutreachCrmPanel
                target={crmTarget}
                templates={templates}
                targetIndex={filteredTargets.findIndex((t) => t.id === crmTarget.id)}
                targetCount={filteredTargets.length}
                onAdjacent={(delta) => {
                  const idx = filteredTargets.findIndex((t) => t.id === crmTarget.id);
                  const next = filteredTargets[idx + delta];
                  if (next) setCrmTargetId(next.id);
                }}
                onClose={() => setCrmTargetId(null)}
                onStatusChange={(status) => void changeStatus(crmTarget, status)}
                onTargetUpdated={(updated) => {
                  setTargets((prev) =>
                    prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row))
                  );
                }}
              />
            ) : null}
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
          <h2 style={{ marginBottom: 12, fontSize: 18 }}>Reference - personas &amp; plan</h2>
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
