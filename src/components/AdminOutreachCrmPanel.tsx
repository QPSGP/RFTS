"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminSectionToggleClass } from "@/components/admin-section-toggle";
import {
  OUTREACH_CATEGORIES,
  OUTREACH_ENTRY_PATHS,
  OUTREACH_INTERESTS,
  OUTREACH_PERSONAS,
  OUTREACH_PIPELINE_STEPS,
  OUTREACH_STATUSES,
  mergeOutreachTemplate,
  outreachPipelineStepForStatus,
  outreachStatusLabel,
  type OutreachPipelineStepId
} from "@/lib/marketing-reference";

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
};

type OutreachContact = {
  id: string;
  targetId: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  phoneMobile: string | null;
  roleTitle: string | null;
  preferredTimes: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  xUrl: string | null;
  websiteUrl: string | null;
  notes: string | null;
  isPrimary: boolean;
};

type OutreachActivity = {
  id: string;
  kind: string;
  subject: string | null;
  bodyPreview: string | null;
  createdByEmail: string | null;
  createdAt: string;
};

type OutreachEmailTemplate = {
  id: string;
  name: string;
  subject: string;
  bodyText: string;
};

type Props = {
  target: OutreachTarget;
  templates: OutreachEmailTemplate[];
  targetIndex?: number;
  targetCount?: number;
  onAdjacent?: (delta: number) => void;
  onClose: () => void;
  onStatusChange?: (status: string) => void;
  onTargetUpdated: (target: OutreachTarget) => void;
};

const emptyContactForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  phoneMobile: "",
  roleTitle: "",
  preferredTimes: "",
  linkedinUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  xUrl: "",
  websiteUrl: "",
  notes: "",
  isPrimary: true
};

type CrmSectionKey = "capture" | "process" | "draft" | "approval" | "send" | "activity";

function sectionsForStatus(status: string): Record<CrmSectionKey, boolean> {
  const step = outreachPipelineStepForStatus(status);
  return {
    capture: step === "capture",
    process: step === "process",
    draft: step === "draft",
    approval: step === "approval",
    send: step === "send",
    activity: false
  };
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function formatWhen(iso: string): string {
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

export default function AdminOutreachCrmPanel({
  target,
  templates,
  targetIndex = -1,
  targetCount = 0,
  onAdjacent,
  onClose,
  onStatusChange,
  onTargetUpdated
}: Props) {
  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [activities, setActivities] = useState<OutreachActivity[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCrm, setSavingCrm] = useState(false);
  const [sending, setSending] = useState(false);

  const [crmForm, setCrmForm] = useState({
    interest: target.interest || "",
    audienceSize: target.audienceSize || "",
    decisionTimeline: target.decisionTimeline || "",
    followUpAt: toDateInput(target.followUpAt),
    doNotEmail: !!target.doNotEmail,
    notes: target.notes || "",
    category: target.category || "",
    persona: target.persona || "",
    entryPath: target.entryPath || ""
  });

  const [contactForm, setContactForm] = useState({ ...emptyContactForm });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);
  const [openCrmSections, setOpenCrmSections] = useState(() =>
    sectionsForStatus(target.status)
  );
  const [activeStep, setActiveStep] = useState<OutreachPipelineStepId>(() =>
    outreachPipelineStepForStatus(target.status)
  );

  const toggleCrmSection = (key: CrmSectionKey) => {
    setOpenCrmSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [sendForm, setSendForm] = useState({
    contactId: "",
    templateId: "",
    subject: "",
    bodyText: "",
    followUpAt: "",
    markContacted: true
  });

  const [noteText, setNoteText] = useState("");
  const [nurtureSummary, setNurtureSummary] = useState<string | null>(null);
  const canSend =
    (target.status === "ready_to_send" || target.status === "contacted") &&
    !target.doNotEmail &&
    Boolean(sendForm.contactId);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, aRes] = await Promise.all([
        fetch(
          `/api/admin/marketing/outreach/contacts?targetId=${encodeURIComponent(target.id)}`,
          { credentials: "include", cache: "no-store" }
        ),
        fetch(
          `/api/admin/marketing/outreach/activities?targetId=${encodeURIComponent(target.id)}`,
          { credentials: "include", cache: "no-store" }
        )
      ]);
      const cData = cRes.ok ? await cRes.json() : { contacts: [] };
      const aData = aRes.ok ? await aRes.json() : { activities: [] };
      const list: OutreachContact[] = Array.isArray(cData.contacts) ? cData.contacts : [];
      setContacts(list);
      setActivities(Array.isArray(aData.activities) ? aData.activities : []);
      setSendForm((f) => ({
        ...f,
        contactId:
          f.contactId ||
          list.find((c) => c.isPrimary && c.email)?.id ||
          list.find((c) => c.email)?.id ||
          ""
      }));
    } finally {
      setLoading(false);
    }
  }, [target.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/marketing/outreach/nurture", {
      credentials: "include",
      cache: "no-store"
    })
      .then((res) => (res.ok ? res.json() : { sequences: [] }))
      .then((data) => {
        if (cancelled) return;
        const row = Array.isArray(data.sequences)
          ? data.sequences.find((s: { targetId: string }) => s.targetId === target.id)
          : null;
        if (!row) {
          setNurtureSummary(null);
          return;
        }
        const next = row.nextInterest
          ? `Next: ${row.nextInterest} (${row.remaining} left)`
          : row.status;
        setNurtureSummary(
          `Weekly interests: ${(row.plan || [])
            .map((p: { interest: string }) => p.interest)
            .join(", ")}. ${next}`
        );
      })
      .catch(() => {
        if (!cancelled) setNurtureSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [target.id]);

  useEffect(() => {
    setCrmForm({
      interest: target.interest || "",
      audienceSize: target.audienceSize || "",
      decisionTimeline: target.decisionTimeline || "",
      followUpAt: toDateInput(target.followUpAt),
      doNotEmail: !!target.doNotEmail,
      notes: target.notes || "",
      category: target.category || "",
      persona: target.persona || "",
      entryPath: target.entryPath || ""
    });
    const step = outreachPipelineStepForStatus(target.status);
    setActiveStep(step);
    setOpenCrmSections(sectionsForStatus(target.status));
    setEditingContactId(null);
    setContactForm({ ...emptyContactForm, isPrimary: true });
  }, [target]);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === sendForm.contactId) || null,
    [contacts, sendForm.contactId]
  );

  const applyTemplate = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    if (!t) {
      setSendForm((f) => ({ ...f, templateId }));
      return;
    }
    const vars = {
      name: selectedContact?.name || selectedContact?.email || "",
      contactName: selectedContact?.name || selectedContact?.email || "",
      firstName: selectedContact?.firstName || "",
      lastName: selectedContact?.lastName || "",
      organization: target.organization,
      persona: crmForm.persona || target.persona || "",
      siteUrl: typeof window !== "undefined" ? window.location.origin : "",
      yourName: "",
      refCode: target.refCode || ""
    };
    setSendForm((f) => ({
      ...f,
      templateId,
      subject: mergeOutreachTemplate(t.subject, vars),
      bodyText: mergeOutreachTemplate(t.bodyText, vars)
    }));
  };

  const saveCrmFields = async (nextStatus?: string) => {
    setSavingCrm(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/marketing/outreach", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: target.id,
          organization: target.organization,
          targetType: target.targetType === "individual" ? "individual" : "organization",
          category: crmForm.category.trim() || null,
          persona: crmForm.persona.trim() || null,
          entryPath: crmForm.entryPath.trim() || null,
          contact: target.contact,
          refCode: target.refCode,
          status: nextStatus || target.status,
          notes: crmForm.notes.trim() || null,
          interest: crmForm.interest.trim() || null,
          audienceSize: crmForm.audienceSize.trim() || null,
          decisionTimeline: crmForm.decisionTimeline.trim() || null,
          followUpAt: crmForm.followUpAt || null,
          doNotEmail: crmForm.doNotEmail
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error || "Could not save CRM fields.");
        return false;
      }
      if (data.target) onTargetUpdated(data.target);
      if (nextStatus) onStatusChange?.(nextStatus);
      setStatus(nextStatus ? `Moved to ${outreachStatusLabel(nextStatus)}.` : "CRM fields saved.");
      await load();
      return true;
    } finally {
      setSavingCrm(false);
    }
  };

  const logPipelineNote = async (subject: string, body: string) => {
    await fetch("/api/admin/marketing/outreach/activities", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: target.id,
        subject,
        body
      })
    }).catch(() => {});
  };

  const saveDraftAndAdvance = async () => {
    if (!sendForm.subject.trim() || !sendForm.bodyText.trim()) {
      setStatus("Add a subject and body before marking the draft ready.");
      return;
    }
    await logPipelineNote(
      "Outreach draft",
      `Subject: ${sendForm.subject.trim()}\n\n${sendForm.bodyText.trim()}`
    );
    const ok = await saveCrmFields("draft_ready");
    if (ok) {
      setActiveStep("approval");
      setOpenCrmSections((s) => ({ ...s, draft: false, approval: true }));
    }
  };

  const requestApproval = async () => {
    const ok = await saveCrmFields("awaiting_approval");
    if (ok) {
      await logPipelineNote("Awaiting approval", "Draft queued for approval before send.");
      setActiveStep("approval");
      setOpenCrmSections((s) => ({ ...s, approval: true }));
    }
  };

  const approveForSend = async () => {
    const ok = await saveCrmFields("ready_to_send");
    if (ok) {
      await logPipelineNote("Approved to send", "Ready for Resend send.");
      setActiveStep("send");
      setOpenCrmSections((s) => ({ ...s, approval: false, send: true }));
    }
  };

  const saveProcessAndAdvance = async () => {
    if (!crmForm.interest.trim() && !crmForm.persona.trim() && !crmForm.entryPath.trim()) {
      setStatus("Choose at least an interest, persona, or entry path.");
      return;
    }
    const ok = await saveCrmFields("process_chosen");
    if (ok) {
      setActiveStep("draft");
      setOpenCrmSections((s) => ({ ...s, process: false, draft: true }));
    }
  };

  const markCaptureComplete = async () => {
    const ok = await saveCrmFields(
      target.status === "prospect" || !target.status ? "prospect" : target.status
    );
    if (ok) {
      setActiveStep("process");
      setOpenCrmSections((s) => ({ ...s, capture: false, process: true }));
    }
  };

  const resetContactForm = (isPrimaryDefault = contacts.length === 0) => {
    setEditingContactId(null);
    setContactForm({ ...emptyContactForm, isPrimary: isPrimaryDefault });
  };

  const startEditContact = (c: OutreachContact) => {
    setEditingContactId(c.id);
    setOpenCrmSections((prev) => ({ ...prev, capture: true }));
    setActiveStep("capture");
    setContactForm({
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      email: c.email || "",
      phone: c.phone || "",
      phoneMobile: c.phoneMobile || "",
      roleTitle: c.roleTitle || "",
      preferredTimes: c.preferredTimes || "",
      linkedinUrl: c.linkedinUrl || "",
      instagramUrl: c.instagramUrl || "",
      facebookUrl: c.facebookUrl || "",
      xUrl: c.xUrl || "",
      websiteUrl: c.websiteUrl || "",
      notes: c.notes || "",
      isPrimary: !!c.isPrimary
    });
  };

  const saveContact = async () => {
    const hasName =
      contactForm.firstName.trim() ||
      contactForm.lastName.trim() ||
      contactForm.email.trim();
    if (!hasName) {
      setStatus("Add a first/last name or email.");
      return;
    }
    setSavingContact(true);
    setStatus(null);
    try {
      const payload = {
        firstName: contactForm.firstName.trim() || null,
        lastName: contactForm.lastName.trim() || null,
        email: contactForm.email.trim() || null,
        phone: contactForm.phone.trim() || null,
        phoneMobile: contactForm.phoneMobile.trim() || null,
        roleTitle: contactForm.roleTitle.trim() || null,
        preferredTimes: contactForm.preferredTimes.trim() || null,
        linkedinUrl: contactForm.linkedinUrl.trim() || null,
        instagramUrl: contactForm.instagramUrl.trim() || null,
        facebookUrl: contactForm.facebookUrl.trim() || null,
        xUrl: contactForm.xUrl.trim() || null,
        websiteUrl: contactForm.websiteUrl.trim() || null,
        notes: contactForm.notes.trim() || null,
        isPrimary: contactForm.isPrimary
      };
      const res = await fetch("/api/admin/marketing/outreach/contacts", {
        method: editingContactId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingContactId
            ? { id: editingContactId, ...payload }
            : { targetId: target.id, ...payload }
        )
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error || "Could not save contact.");
        return;
      }
      const wasEditing = !!editingContactId;
      resetContactForm(false);
      setStatus(wasEditing ? "Contact updated." : "Contact added.");
      await load();
    } finally {
      setSavingContact(false);
    }
  };

  const removeContact = async (c: OutreachContact) => {
    if (!window.confirm(`Remove contact ${c.name || c.email || c.id}?`)) return;
    await fetch(
      `/api/admin/marketing/outreach/contacts?id=${encodeURIComponent(c.id)}`,
      { method: "DELETE", credentials: "include" }
    );
    if (editingContactId === c.id) resetContactForm(false);
    await load();
  };

  const sendEmail = async () => {
    if (!sendForm.contactId) {
      setStatus("Select a contact with an email.");
      return;
    }
    if (!sendForm.subject.trim() || !sendForm.bodyText.trim()) {
      setStatus("Subject and body are required.");
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/marketing/outreach/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: target.id,
          contactId: sendForm.contactId,
          templateId: sendForm.templateId || undefined,
          subject: sendForm.subject,
          bodyText: sendForm.bodyText,
          markContacted: sendForm.markContacted,
          followUpAt: sendForm.followUpAt || null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error || "Send failed.");
        return;
      }
      if (data.target) onTargetUpdated(data.target);
      setStatus(`Email sent to ${selectedContact?.email || "contact"}.`);
      await load();
    } finally {
      setSending(false);
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    const res = await fetch("/api/admin/marketing/outreach/activities", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: target.id,
        subject: "Note",
        body: noteText.trim()
      })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data?.error || "Could not save note.");
      return;
    }
    setNoteText("");
    await load();
  };

  const importLegacyEmails = async () => {
    const raw = (target.contact || "").split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    const emails = raw.filter((e) => e.includes("@"));
    if (!emails.length) {
      setStatus("No emails found in legacy contact field.");
      return;
    }
    for (let i = 0; i < emails.length; i++) {
      await fetch("/api/admin/marketing/outreach/contacts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: target.id,
          name: "",
          email: emails[i],
          isPrimary: i === 0 && contacts.length === 0
        })
      });
    }
    setStatus(`Imported ${emails.length} contact(s) from legacy field.`);
    await load();
  };

  return (
    <div
      className="card"
      style={{
        marginTop: 0,
        border: "1px solid #0f766e",
        background: "#f0fdfa",
        minWidth: 0,
        maxWidth: "100%"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-start"
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 220px" }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>CRM - {target.organization}</h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569" }}>
            {target.targetType === "individual" ? "Individual" : "Organization"} ·{" "}
            {outreachStatusLabel(target.status)}
            {targetIndex >= 0 && targetCount > 0
              ? ` · ${targetIndex + 1} of ${targetCount}`
              : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {onAdjacent ? (
            <>
              <button
                type="button"
                className="button button-secondary"
                style={{ width: "auto" }}
                disabled={targetIndex <= 0}
                onClick={() => onAdjacent(-1)}
              >
                ← Previous
              </button>
              <button
                type="button"
                className="button button-secondary"
                style={{ width: "auto" }}
                disabled={targetIndex < 0 || targetIndex >= targetCount - 1}
                onClick={() => onAdjacent(1)}
              >
                Next →
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="button button-secondary"
            style={{ width: "auto" }}
            onClick={onClose}
          >
            Back to list
          </button>
        </div>
      </div>

      <div className="outreach-pipeline-steps" aria-label="Outreach pipeline">
        {OUTREACH_PIPELINE_STEPS.map((step) => {
          const order = OUTREACH_PIPELINE_STEPS.findIndex((s) => s.id === step.id);
          const activeOrder = OUTREACH_PIPELINE_STEPS.findIndex((s) => s.id === activeStep);
          const isActive = step.id === activeStep;
          const isDone = order < activeOrder;
          return (
            <button
              key={step.id}
              type="button"
              className={`outreach-pipeline-step${isActive ? " is-active" : ""}${
                isDone ? " is-done" : ""
              }`}
              title={step.description}
              onClick={() => {
                setActiveStep(step.id);
                setOpenCrmSections((prev) => ({
                  ...prev,
                  capture: step.id === "capture",
                  process: step.id === "process",
                  draft: step.id === "draft",
                  approval: step.id === "approval",
                  send: step.id === "send"
                }));
              }}
            >
              {step.label}
            </button>
          );
        })}
      </div>

      <label style={{ display: "grid", gap: 4, fontSize: 13, marginTop: 12, maxWidth: 280 }}>
        Pipeline status
        <select
          value={
            OUTREACH_STATUSES.some((s) => s.id === target.status) ? target.status : "prospect"
          }
          onChange={(e) => {
            void saveCrmFields(e.target.value);
          }}
        >
          {OUTREACH_STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      {status && (
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "#374151" }}>{status}</p>
      )}
      {nurtureSummary ? (
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "#4b5563" }}>{nurtureSummary}</p>
      ) : null}
      {loading && (
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "#6b7280" }}>Loading…</p>
      )}

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <button
          type="button"
          className={adminSectionToggleClass(openCrmSections.capture, true)}
          aria-expanded={openCrmSections.capture}
          onClick={() => toggleCrmSection("capture")}
        >
          {openCrmSections.capture ? "▼" : "▶"} 1 · Capture in CRM
          {contacts.length ? ` · ${contacts.length} contact(s)` : " · add contacts"}
          {crmForm.doNotEmail ? " · do not email" : ""}
        </button>
        {openCrmSections.capture ? (
          <div className="card" style={{ background: "#fff", margin: 0 }}>
            <p style={{ marginTop: 0, fontSize: 13, color: "#64748b" }}>
              Confirm contact details and notes first. Then choose the marketing process.
            </p>
            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                Follow-up date
                <input
                  type="date"
                  value={crmForm.followUpAt}
                  onChange={(e) => setCrmForm((f) => ({ ...f, followUpAt: e.target.value }))}
                />
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={crmForm.doNotEmail}
                  onChange={(e) => setCrmForm((f) => ({ ...f, doNotEmail: e.target.checked }))}
                />
                Do not email
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                Notes
                <textarea
                  rows={3}
                  value={crmForm.notes}
                  onChange={(e) => setCrmForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ width: "auto" }}
                  disabled={savingCrm}
                  onClick={() => void saveCrmFields()}
                >
                  {savingCrm ? "Saving…" : "Save capture"}
                </button>
                <button
                  type="button"
                  className="button"
                  style={{ width: "auto" }}
                  disabled={savingCrm}
                  onClick={() => void markCaptureComplete()}
                >
                  Continue to process →
                </button>
              </div>
            </div>
            <h5 style={{ margin: "0 0 8px", fontSize: 14 }}>Contacts ({contacts.length})</h5>
            <p style={{ marginTop: 0, fontSize: 12, color: "#64748b" }}>
              Full contact records - names, phones, socials, notes. Email send uses contacts with an
              address.
            </p>
            {target.contact && contacts.length === 0 ? (
              <p style={{ fontSize: 13, color: "#64748b" }}>
                Legacy emails: {target.contact}{" "}
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ width: "auto", padding: "4px 8px", fontSize: 12, marginLeft: 6 }}
                  onClick={() => void importLegacyEmails()}
                >
                  Import as contacts
                </button>
              </p>
            ) : null}
            <ul style={{ margin: "0 0 12px", paddingLeft: 0, listStyle: "none", fontSize: 13 }}>
              {contacts.map((c) => (
                <li
                  key={c.id}
                  style={{
                    marginBottom: 10,
                    paddingBottom: 10,
                    borderBottom: "1px solid #e5e7eb"
                  }}
                >
                  <div
                    style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}
                  >
                    <strong>{c.name || "-"}</strong>
                    {c.isPrimary ? (
                      <span style={{ fontSize: 11, color: "#0f766e" }}>primary</span>
                    ) : null}
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ width: "auto", padding: "2px 8px", fontSize: 11 }}
                      onClick={() => startEditContact(c)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ width: "auto", padding: "2px 8px", fontSize: 11 }}
                      onClick={() => void removeContact(c)}
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ color: "#4b5563", marginTop: 2 }}>
                    {c.email ? (
                      <div>{c.email}</div>
                    ) : (
                      <div style={{ color: "#9ca3af" }}>no email</div>
                    )}
                    {c.roleTitle ? <div>{c.roleTitle}</div> : null}
                    {c.phone || c.phoneMobile ? (
                      <div>
                        {[
                          c.phone ? `Work ${c.phone}` : null,
                          c.phoneMobile ? `Mobile ${c.phoneMobile}` : null
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    ) : null}
                    {[
                      c.linkedinUrl ? `LinkedIn: ${c.linkedinUrl}` : null,
                      c.instagramUrl ? `IG: ${c.instagramUrl}` : null,
                      c.facebookUrl ? `FB: ${c.facebookUrl}` : null,
                      c.xUrl ? `X: ${c.xUrl}` : null,
                      c.websiteUrl ? `Web: ${c.websiteUrl}` : null
                    ]
                      .filter(Boolean)
                      .map((line) => (
                        <div key={line as string} style={{ fontSize: 12, wordBreak: "break-all" }}>
                          {line}
                        </div>
                      ))}
                    {c.notes ? (
                      <div style={{ marginTop: 4, whiteSpace: "pre-wrap", color: "#374151" }}>
                        {c.notes}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
              {!contacts.length && (
                <li style={{ color: "#6b7280" }}>No structured contacts yet.</li>
              )}
            </ul>
            <h5 style={{ margin: "0 0 8px", fontSize: 14 }}>
              {editingContactId ? "Edit contact" : "Add contact"}
            </h5>
            <div style={{ display: "grid", gap: 8 }}>
              <div className="grid grid-2" style={{ gap: 8 }}>
                <input
                  placeholder="First name"
                  value={contactForm.firstName}
                  onChange={(e) => setContactForm((f) => ({ ...f, firstName: e.target.value }))}
                />
                <input
                  placeholder="Last name"
                  value={contactForm.lastName}
                  onChange={(e) => setContactForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <input
                placeholder="Email"
                value={contactForm.email}
                onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
              />
              <div className="grid grid-2" style={{ gap: 8 }}>
                <input
                  placeholder="Work / main phone"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <input
                  placeholder="Mobile phone"
                  value={contactForm.phoneMobile}
                  onChange={(e) => setContactForm((f) => ({ ...f, phoneMobile: e.target.value }))}
                />
              </div>
              <input
                placeholder="Role / title"
                value={contactForm.roleTitle}
                onChange={(e) => setContactForm((f) => ({ ...f, roleTitle: e.target.value }))}
              />
              <input
                placeholder="Best contact times"
                value={contactForm.preferredTimes}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, preferredTimes: e.target.value }))
                }
              />
              <input
                placeholder="LinkedIn URL"
                value={contactForm.linkedinUrl}
                onChange={(e) => setContactForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
              />
              <input
                placeholder="Instagram URL or @handle"
                value={contactForm.instagramUrl}
                onChange={(e) => setContactForm((f) => ({ ...f, instagramUrl: e.target.value }))}
              />
              <input
                placeholder="Facebook URL"
                value={contactForm.facebookUrl}
                onChange={(e) => setContactForm((f) => ({ ...f, facebookUrl: e.target.value }))}
              />
              <input
                placeholder="X / Twitter URL or @handle"
                value={contactForm.xUrl}
                onChange={(e) => setContactForm((f) => ({ ...f, xUrl: e.target.value }))}
              />
              <input
                placeholder="Website"
                value={contactForm.websiteUrl}
                onChange={(e) => setContactForm((f) => ({ ...f, websiteUrl: e.target.value }))}
              />
              <textarea
                placeholder="Contact notes (preferences, history, how you met…)"
                rows={3}
                value={contactForm.notes}
                onChange={(e) => setContactForm((f) => ({ ...f, notes: e.target.value }))}
                style={{ fontFamily: "inherit", resize: "vertical" }}
              />
              <label style={{ display: "flex", gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={contactForm.isPrimary}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, isPrimary: e.target.checked }))
                  }
                />
                Primary contact
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="button"
                  style={{ width: "auto" }}
                  disabled={savingContact}
                  onClick={() => void saveContact()}
                >
                  {savingContact
                    ? "Saving…"
                    : editingContactId
                      ? "Save contact"
                      : "Add contact"}
                </button>
                {editingContactId ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ width: "auto" }}
                    onClick={() => resetContactForm(false)}
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className={adminSectionToggleClass(openCrmSections.process, true)}
          aria-expanded={openCrmSections.process}
          onClick={() => toggleCrmSection("process")}
        >
          {openCrmSections.process ? "▼" : "▶"} 2 · Choose marketing process
          {crmForm.interest ? ` · ${crmForm.interest}` : ""}
        </button>
        {openCrmSections.process ? (
          <div className="card" style={{ background: "#fff", margin: 0 }}>
            <p style={{ marginTop: 0, fontSize: 13, color: "#64748b" }}>
              Decide the best path for this prospect before drafting outreach.
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                Interest / offer
                <select
                  value={crmForm.interest}
                  onChange={(e) => setCrmForm((f) => ({ ...f, interest: e.target.value }))}
                >
                  <option value="">-</option>
                  {OUTREACH_INTERESTS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                Persona
                <select
                  value={crmForm.persona}
                  onChange={(e) => setCrmForm((f) => ({ ...f, persona: e.target.value }))}
                >
                  <option value="">-</option>
                  {OUTREACH_PERSONAS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                Entry path
                <select
                  value={crmForm.entryPath}
                  onChange={(e) => setCrmForm((f) => ({ ...f, entryPath: e.target.value }))}
                >
                  <option value="">-</option>
                  {OUTREACH_ENTRY_PATHS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                Category
                <select
                  value={crmForm.category}
                  onChange={(e) => setCrmForm((f) => ({ ...f, category: e.target.value }))}
                >
                  <option value="">-</option>
                  {OUTREACH_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                {target.targetType === "individual" ? "Reach / following" : "Audience size"}
                <input
                  value={crmForm.audienceSize}
                  onChange={(e) => setCrmForm((f) => ({ ...f, audienceSize: e.target.value }))}
                  placeholder={
                    target.targetType === "individual"
                      ? "e.g. newsletter ~5k"
                      : "e.g. 200 staff"
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                Decision timeline
                <input
                  value={crmForm.decisionTimeline}
                  onChange={(e) =>
                    setCrmForm((f) => ({ ...f, decisionTimeline: e.target.value }))
                  }
                  placeholder="e.g. Q3 review"
                />
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ width: "auto" }}
                  disabled={savingCrm}
                  onClick={() => void saveCrmFields()}
                >
                  Save process
                </button>
                <button
                  type="button"
                  className="button"
                  style={{ width: "auto" }}
                  disabled={savingCrm}
                  onClick={() => void saveProcessAndAdvance()}
                >
                  Continue to draft →
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className={adminSectionToggleClass(openCrmSections.draft, true)}
          aria-expanded={openCrmSections.draft}
          onClick={() => toggleCrmSection("draft")}
        >
          {openCrmSections.draft ? "▼" : "▶"} 3 · Set up draft
          {sendForm.subject ? " · draft started" : ""}
        </button>
        {openCrmSections.draft ? (
          <div className="card" style={{ background: "#fff", margin: 0 }}>
            {target.doNotEmail ? (
              <p style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>
                Do-not-email is on. Clear it under Capture before drafting a send.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                  To (contact)
                  <select
                    value={sendForm.contactId}
                    onChange={(e) => setSendForm((f) => ({ ...f, contactId: e.target.value }))}
                  >
                    <option value="">-</option>
                    {contacts
                      .filter((c) => c.email)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {(c.name || "Contact") + ` <${c.email}>`}
                        </option>
                      ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                  Template
                  <select
                    value={sendForm.templateId}
                    onChange={(e) => applyTemplate(e.target.value)}
                  >
                    <option value="">- custom / blank -</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                  Subject
                  <input
                    value={sendForm.subject}
                    onChange={(e) => setSendForm((f) => ({ ...f, subject: e.target.value }))}
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                  Body
                  <textarea
                    rows={8}
                    value={sendForm.bodyText}
                    onChange={(e) => setSendForm((f) => ({ ...f, bodyText: e.target.value }))}
                    style={{ fontFamily: "inherit" }}
                  />
                </label>
                <button
                  type="button"
                  className="button"
                  style={{ width: "auto" }}
                  disabled={savingCrm}
                  onClick={() => void saveDraftAndAdvance()}
                >
                  Save draft &amp; continue to approval →
                </button>
              </div>
            )}
          </div>
        ) : null}

        <button
          type="button"
          className={adminSectionToggleClass(openCrmSections.approval, true)}
          aria-expanded={openCrmSections.approval}
          onClick={() => toggleCrmSection("approval")}
        >
          {openCrmSections.approval ? "▼" : "▶"} 4 · Approval
          {target.status === "ready_to_send" ? " · approved" : ""}
          {target.status === "awaiting_approval" ? " · waiting" : ""}
        </button>
        {openCrmSections.approval ? (
          <div className="card" style={{ background: "#fff", margin: 0 }}>
            <p style={{ marginTop: 0, fontSize: 13, color: "#64748b" }}>
              Review the draft, then approve. Send stays locked until status is{" "}
              <strong>Approved to send</strong>.
            </p>
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: "6px 12px",
                fontSize: 13,
                margin: "0 0 12px"
              }}
            >
              <dt>Process</dt>
              <dd>{crmForm.interest || target.interest || "-"}</dd>
              <dt>Persona</dt>
              <dd>{crmForm.persona || target.persona || "-"}</dd>
              <dt>Path</dt>
              <dd>{crmForm.entryPath || target.entryPath || "-"}</dd>
              <dt>To</dt>
              <dd>
                {selectedContact
                  ? `${selectedContact.name || "Contact"} <${selectedContact.email}>`
                  : "-"}
              </dd>
              <dt>Subject</dt>
              <dd>{sendForm.subject || "-"}</dd>
            </dl>
            {sendForm.bodyText ? (
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  fontSize: 13,
                  background: "#f8fafc",
                  padding: 12,
                  borderRadius: 8,
                  margin: "0 0 12px",
                  maxHeight: 220,
                  overflow: "auto"
                }}
              >
                {sendForm.bodyText}
              </pre>
            ) : (
              <p style={{ fontSize: 13, color: "#b91c1c" }}>
                No draft loaded yet. Go back to step 3 and save a draft.
              </p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="button button-secondary"
                style={{ width: "auto" }}
                disabled={savingCrm || !sendForm.subject.trim()}
                onClick={() => void requestApproval()}
              >
                Mark awaiting approval
              </button>
              <button
                type="button"
                className="button"
                style={{ width: "auto" }}
                disabled={savingCrm || !sendForm.subject.trim()}
                onClick={() => void approveForSend()}
              >
                Approve for send →
              </button>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className={adminSectionToggleClass(openCrmSections.send, true)}
          aria-expanded={openCrmSections.send}
          onClick={() => toggleCrmSection("send")}
        >
          {openCrmSections.send ? "▼" : "▶"} 5 · Send
          {target.doNotEmail ? " · blocked" : ""}
          {target.status === "contacted"
            ? " · follow-up ok"
            : target.status !== "ready_to_send"
              ? " · needs approval"
              : ""}
        </button>
        {openCrmSections.send ? (
          <div className="card" style={{ background: "#fff", margin: 0 }}>
            {target.doNotEmail ? (
              <p style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>
                Do-not-email is on for this target. Clear it under Capture to send.
              </p>
            ) : target.status !== "ready_to_send" && target.status !== "contacted" ? (
              <p style={{ color: "#b45309", fontSize: 13, margin: 0 }}>
                This record is not approved yet. Complete steps 3-4, then Approve for send.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                  Final send via Resend. Confirm recipient and follow-up, then send.
                </p>
                <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                  To (contact)
                  <select
                    value={sendForm.contactId}
                    onChange={(e) => setSendForm((f) => ({ ...f, contactId: e.target.value }))}
                  >
                    <option value="">-</option>
                    {contacts
                      .filter((c) => c.email)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {(c.name || "Contact") + ` <${c.email}>`}
                        </option>
                      ))}
                  </select>
                </label>
                <div style={{ fontSize: 13 }}>
                  <strong>Subject:</strong> {sendForm.subject || "-"}
                </div>
                <label style={{ display: "grid", gap: 4, fontSize: 13, maxWidth: 220 }}>
                  Set follow-up after send
                  <input
                    type="date"
                    value={sendForm.followUpAt}
                    onChange={(e) => setSendForm((f) => ({ ...f, followUpAt: e.target.value }))}
                  />
                </label>
                <label style={{ display: "flex", gap: 8, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={sendForm.markContacted}
                    onChange={(e) =>
                      setSendForm((f) => ({ ...f, markContacted: e.target.checked }))
                    }
                  />
                  Mark status Contacted after send
                </label>
                <button
                  type="button"
                  className="button"
                  style={{ width: "auto" }}
                  disabled={sending || !canSend}
                  onClick={() => void sendEmail()}
                >
                  {sending ? "Sending…" : "Send via Resend"}
                </button>
              </div>
            )}
          </div>
        ) : null}

        <button
          type="button"
          className={adminSectionToggleClass(openCrmSections.activity, true)}
          aria-expanded={openCrmSections.activity}
          onClick={() => toggleCrmSection("activity")}
        >
          {openCrmSections.activity ? "▼" : "▶"} Activity ({activities.length})
        </button>
        {openCrmSections.activity ? (
          <div className="card" style={{ background: "#fff", margin: 0 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <input
                style={{ flex: "1 1 200px" }}
                placeholder="Add a note or call log…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <button
                type="button"
                className="button button-secondary"
                style={{ width: "auto" }}
                onClick={() => void addNote()}
              >
                Add note
              </button>
            </div>
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: 13 }}>
              {activities.map((a) => (
                <li
                  key={a.id}
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid #e5e7eb"
                  }}
                >
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    {formatWhen(a.createdAt)}
                    {a.createdByEmail ? ` · ${a.createdByEmail}` : ""} · {a.kind}
                  </div>
                  <div style={{ fontWeight: 600 }}>{a.subject || a.kind}</div>
                  {a.bodyPreview ? (
                    <div style={{ color: "#4b5563", whiteSpace: "pre-wrap" }}>{a.bodyPreview}</div>
                  ) : null}
                </li>
              ))}
              {!activities.length && (
                <li style={{ color: "#6b7280" }}>No activity yet.</li>
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
