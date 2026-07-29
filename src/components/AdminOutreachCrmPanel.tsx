"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OUTREACH_INTERESTS } from "@/lib/marketing-reference";
import { mergeOutreachTemplate } from "@/lib/marketing-reference";

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
  email: string | null;
  phone: string | null;
  roleTitle: string | null;
  preferredTimes: string | null;
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
  onClose: () => void;
  onTargetUpdated: (target: OutreachTarget) => void;
};

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
  onClose,
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
    notes: target.notes || ""
  });

  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    roleTitle: "",
    preferredTimes: "",
    isPrimary: true
  });

  const [sendForm, setSendForm] = useState({
    contactId: "",
    templateId: "",
    subject: "",
    bodyText: "",
    followUpAt: "",
    markContacted: true
  });

  const [noteText, setNoteText] = useState("");

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
    setCrmForm({
      interest: target.interest || "",
      audienceSize: target.audienceSize || "",
      decisionTimeline: target.decisionTimeline || "",
      followUpAt: toDateInput(target.followUpAt),
      doNotEmail: !!target.doNotEmail,
      notes: target.notes || ""
    });
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
      organization: target.organization,
      persona: target.persona || "",
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

  const saveCrmFields = async () => {
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
          category: target.category,
          persona: target.persona,
          entryPath: target.entryPath,
          contact: target.contact,
          refCode: target.refCode,
          status: target.status,
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
        return;
      }
      if (data.target) onTargetUpdated(data.target);
      setStatus("CRM fields saved.");
      await load();
    } finally {
      setSavingCrm(false);
    }
  };

  const addContact = async () => {
    if (!contactForm.email.trim() && !contactForm.name.trim()) {
      setStatus("Add a contact name or email.");
      return;
    }
    setStatus(null);
    const res = await fetch("/api/admin/marketing/outreach/contacts", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: target.id,
        name: contactForm.name.trim() || null,
        email: contactForm.email.trim() || null,
        phone: contactForm.phone.trim() || null,
        roleTitle: contactForm.roleTitle.trim() || null,
        preferredTimes: contactForm.preferredTimes.trim() || null,
        isPrimary: contactForm.isPrimary
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.error || "Could not add contact.");
      return;
    }
    setContactForm({
      name: "",
      email: "",
      phone: "",
      roleTitle: "",
      preferredTimes: "",
      isPrimary: contacts.length === 0
    });
    setStatus("Contact added.");
    await load();
  };

  const removeContact = async (c: OutreachContact) => {
    if (!window.confirm(`Remove contact ${c.name || c.email || c.id}?`)) return;
    await fetch(
      `/api/admin/marketing/outreach/contacts?id=${encodeURIComponent(c.id)}`,
      { method: "DELETE", credentials: "include" }
    );
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
        marginTop: 16,
        border: "1px solid #0f766e",
        background: "#f0fdfa"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "baseline"
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 17 }}>CRM — {target.organization}</h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569" }}>
            {target.targetType === "individual" ? "Individual" : "Organization"} · contacts, send
            email (Resend), follow-ups, and activity timeline.
          </p>
        </div>
        <button
          type="button"
          className="button button-secondary"
          style={{ width: "auto" }}
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {status && (
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "#374151" }}>{status}</p>
      )}
      {loading && (
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "#6b7280" }}>Loading…</p>
      )}

      <div
        style={{
          display: "grid",
          gap: 16,
          marginTop: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
        }}
      >
        <div className="card" style={{ background: "#fff" }}>
          <h4 style={{ marginTop: 0, fontSize: 15 }}>Gather info</h4>
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              Interest
              <select
                value={crmForm.interest}
                onChange={(e) => setCrmForm((f) => ({ ...f, interest: e.target.value }))}
              >
                <option value="">—</option>
                {OUTREACH_INTERESTS.map((i) => (
                  <option key={i} value={i}>
                    {i}
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
            <button
              type="button"
              className="button"
              style={{ width: "auto" }}
              disabled={savingCrm}
              onClick={() => void saveCrmFields()}
            >
              {savingCrm ? "Saving…" : "Save CRM fields"}
            </button>
          </div>
        </div>

        <div className="card" style={{ background: "#fff" }}>
          <h4 style={{ marginTop: 0, fontSize: 15 }}>Contacts</h4>
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
          <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 13 }}>
            {contacts.map((c) => (
              <li key={c.id} style={{ marginBottom: 6 }}>
                <strong>{c.name || "—"}</strong>
                {c.isPrimary ? " (primary)" : ""}{" "}
                {c.email ? <span>{c.email}</span> : <span style={{ color: "#9ca3af" }}>no email</span>}
                {c.roleTitle ? ` · ${c.roleTitle}` : ""}
                {c.phone ? ` · ${c.phone}` : ""}
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ width: "auto", padding: "2px 8px", fontSize: 11, marginLeft: 8 }}
                  onClick={() => void removeContact(c)}
                >
                  Remove
                </button>
              </li>
            ))}
            {!contacts.length && (
              <li style={{ color: "#6b7280", listStyle: "none", marginLeft: -18 }}>
                No structured contacts yet.
              </li>
            )}
          </ul>
          <div style={{ display: "grid", gap: 8 }}>
            <input
              placeholder="Name"
              value={contactForm.name}
              onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              placeholder="Email"
              value={contactForm.email}
              onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
            />
            <input
              placeholder="Phone"
              value={contactForm.phone}
              onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
            />
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
            <button
              type="button"
              className="button button-secondary"
              style={{ width: "auto" }}
              onClick={() => void addContact()}
            >
              Add contact
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ background: "#fff", marginTop: 16 }}>
        <h4 style={{ marginTop: 0, fontSize: 15 }}>Send email</h4>
        {target.doNotEmail ? (
          <p style={{ color: "#b91c1c", fontSize: 13 }}>
            Do-not-email is on for this organization. Clear it under Gather info to send.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              To (contact)
              <select
                value={sendForm.contactId}
                onChange={(e) => setSendForm((f) => ({ ...f, contactId: e.target.value }))}
              >
                <option value="">—</option>
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
                <option value="">— custom / blank —</option>
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
              Mark status Contacted if currently Prospect
            </label>
            <button
              type="button"
              className="button"
              style={{ width: "auto" }}
              disabled={sending}
              onClick={() => void sendEmail()}
            >
              {sending ? "Sending…" : "Send via Resend"}
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ background: "#fff", marginTop: 16 }}>
        <h4 style={{ marginTop: 0, fontSize: 15 }}>Activity</h4>
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
    </div>
  );
}
