"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";
import {
  EVENT_LEAD_CARD_GOALS,
  EVENT_LEAD_CORE_GOALS,
  EVENT_LEAD_FORM_TYPES,
  EVENT_LEAD_STATUSES,
  EVENT_LEAD_WELLNESS_FOCUS,
  EXPO_PRACTICE_DEFAULTS,
  LONG_BEACH_EXPO_2026,
  displayLeadName,
  type EventLeadFormTypeId,
  type EventLeadRecord
} from "@/lib/event-leads";
import {
  OUTREACH_CATEGORIES,
  OUTREACH_ENTRY_PATHS,
  OUTREACH_INTERESTS,
  OUTREACH_PERSONAS
} from "@/lib/marketing-reference";

type Props = {
  open: boolean;
};

type LeadFormState = {
  formType: EventLeadFormTypeId;
  status: string;
  eventName: string;
  eventDates: string;
  eventKey: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneMobile: string;
  smsOk: boolean;
  city: string;
  state: string;
  zip: string;
  persona: string;
  category: string;
  interest: string;
  entryPath: string;
  capturedBy: string;
  notes: string;
  primaryOccupation: string;
  incomeGoalAmount: string;
  incomeGoalYear: string;
  wantFullTime: boolean;
  goalInterests: string[];
};

function emptyAddForm(): LeadFormState {
  return {
    formType: "practice_survey",
    status: "new",
    eventName: EXPO_PRACTICE_DEFAULTS.eventName,
    eventDates: EXPO_PRACTICE_DEFAULTS.eventDates,
    eventKey: LONG_BEACH_EXPO_2026.eventKey,
    fullName: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneMobile: "",
    smsOk: false,
    city: "",
    state: "",
    zip: "",
    persona: EXPO_PRACTICE_DEFAULTS.persona,
    category: EXPO_PRACTICE_DEFAULTS.category,
    interest: EXPO_PRACTICE_DEFAULTS.interest,
    entryPath: EXPO_PRACTICE_DEFAULTS.entryPath,
    capturedBy: "",
    notes: "",
    primaryOccupation: "",
    incomeGoalAmount: "",
    incomeGoalYear: "",
    wantFullTime: false,
    goalInterests: []
  };
}

function formFromLead(lead: EventLeadRecord): LeadFormState {
  const practice =
    lead.payload?.practice && typeof lead.payload.practice === "object"
      ? (lead.payload.practice as Record<string, unknown>)
      : {};
  const consumer =
    lead.payload?.consumer && typeof lead.payload.consumer === "object"
      ? (lead.payload.consumer as Record<string, unknown>)
      : {};
  const goalInterestsRaw = Array.isArray(consumer.goalInterests)
    ? consumer.goalInterests
    : Array.isArray(practice.goalInterests)
      ? practice.goalInterests
      : [];
  const goalInterests = (goalInterestsRaw as unknown[])
    .map((g) => String(g).trim())
    .filter(Boolean);
  return {
    formType: lead.formType,
    status: lead.status,
    eventName: lead.eventName || "",
    eventDates: lead.eventDates || "",
    eventKey: lead.eventKey || "",
    fullName: lead.fullName || "",
    firstName: lead.firstName || "",
    lastName: lead.lastName || "",
    email: lead.email || "",
    phoneMobile: lead.phoneMobile || "",
    smsOk: lead.smsOk,
    city: lead.city || "",
    state: lead.state || "",
    zip: lead.zip || "",
    persona: lead.persona || "",
    category: lead.category || "",
    interest: lead.interest || "",
    entryPath: lead.entryPath || "",
    capturedBy: lead.capturedBy || "",
    notes: lead.notes || "",
    primaryOccupation: String(practice.primaryOccupation || consumer.position || ""),
    incomeGoalAmount: String(
      practice.incomeGoalAmount || consumer.incomeGoalAmount || ""
    ),
    incomeGoalYear: String(practice.incomeGoalYear || consumer.incomeGoalYear || ""),
    wantFullTime: Boolean(practice.wantFullTime),
    goalInterests
  };
}

function payloadFromForm(form: LeadFormState) {
  if (form.formType === "practice_survey") {
    return {
      practice: {
        primaryOccupation: form.primaryOccupation.trim() || null,
        incomeGoalAmount: form.incomeGoalAmount.trim() || null,
        incomeGoalYear: form.incomeGoalYear.trim() || null,
        wantFullTime: form.wantFullTime,
        wantTxt: form.smsOk,
        goalInterests: form.goalInterests
      },
      consumer: null
    };
  }
  return {
    practice: null,
    consumer: {
      offerCode: "abundance-magnet",
      goalInterests: form.goalInterests,
      incomeGoalAmount: form.incomeGoalAmount.trim() || null,
      incomeGoalYear: form.incomeGoalYear.trim() || null,
      position: form.primaryOccupation.trim() || null
    }
  };
}

function bodyFromForm(form: LeadFormState) {
  const extras = payloadFromForm(form);
  return {
    formType: form.formType,
    status: form.status,
    eventName: form.eventName.trim(),
    eventDates: form.eventDates.trim() || null,
    eventKey: form.eventKey.trim() || null,
    fullName: form.fullName.trim() || null,
    firstName: form.firstName.trim() || null,
    lastName: form.lastName.trim() || null,
    email: form.email.trim() || null,
    phoneMobile: form.phoneMobile.trim() || null,
    smsOk: form.smsOk,
    city: form.city.trim() || null,
    state: form.state.trim() || null,
    zip: form.zip.trim() || null,
    persona: form.persona.trim() || null,
    category: form.category.trim() || null,
    interest: form.interest.trim() || null,
    entryPath: form.entryPath.trim() || null,
    capturedBy: form.capturedBy.trim() || null,
    notes: form.notes.trim() || null,
    autoReply: false,
    ...extras
  };
}

export default function AdminEventLeadsPanel({ open }: Props) {
  const [leads, setLeads] = useState<EventLeadRecord[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterEventKey, setFilterEventKey] = useState("");
  const [mode, setMode] = useState<"view" | "edit" | "add">("view");
  const [form, setForm] = useState<LeadFormState>(emptyAddForm);
  const [saving, setSaving] = useState(false);

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

  const selectedIndex = useMemo(
    () => (selectedId ? leads.findIndex((l) => l.id === selectedId) : -1),
    [leads, selectedId]
  );
  const selected = selectedIndex >= 0 ? leads[selectedIndex] : null;
  const showingLead = Boolean(selectedId) && (mode === "view" || mode === "edit");
  const showingList = !showingLead && mode !== "add";

  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);

  function openAdd() {
    setMode("add");
    setSelectedId(null);
    setForm(emptyAddForm());
    setMessage(null);
  }

  function openEdit(lead: EventLeadRecord) {
    setSelectedId(lead.id);
    setMode("edit");
    setForm(formFromLead(lead));
    setMessage(null);
  }

  function openView(lead: EventLeadRecord) {
    setSelectedId(lead.id);
    setMode("view");
    setMessage(null);
  }

  function closeLead() {
    setSelectedId(null);
    setMode("view");
    setMessage(null);
  }

  const goAdjacent = useCallback(
    (delta: number, options?: { edit?: boolean }) => {
      if (leads.length === 0) return;
      const stayInEdit = Boolean(options?.edit);
      let nextIndex: number;
      if (selectedIndex < 0) {
        // Add form: next opens first record, previous opens last.
        nextIndex = delta > 0 ? 0 : leads.length - 1;
      } else {
        nextIndex = selectedIndex + delta;
        if (nextIndex < 0 || nextIndex >= leads.length) return;
      }
      const next = leads[nextIndex];
      setSelectedId(next.id);
      if (stayInEdit) {
        setMode("edit");
        setForm(formFromLead(next));
      } else {
        setMode("view");
      }
      setMessage(null);
    },
    [leads, selectedIndex]
  );

  const canGoPrev =
    leads.length > 0 && (selectedIndex < 0 || selectedIndex > 0);
  const canGoNext =
    leads.length > 0 && (selectedIndex < 0 || selectedIndex < leads.length - 1);

  const goalInterestOptions = useMemo(() => {
    const known = new Set<string>([
      ...EVENT_LEAD_CORE_GOALS,
      ...EVENT_LEAD_WELLNESS_FOCUS,
      ...EVENT_LEAD_CARD_GOALS
    ]);
    const extras = form.goalInterests.filter((g) => !known.has(g));
    return extras;
  }, [form.goalInterests]);

  function onLeadPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (mode !== "view") return;
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
  }

  function onLeadPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (mode !== "view" || swipeStartX.current == null || swipeStartY.current == null) {
      swipeStartX.current = null;
      swipeStartY.current = null;
      return;
    }
    const dx = e.clientX - swipeStartX.current;
    const dy = e.clientY - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (dx < 0) goAdjacent(1);
    else goAdjacent(-1);
  }

  useEffect(() => {
    if (!showingLead && mode !== "add") return;
    if (mode !== "view" && mode !== "edit" && mode !== "add") return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const editNav = mode === "edit" || mode === "add";
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goAdjacent(-1, editNav ? { edit: true } : undefined);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goAdjacent(1, editNav ? { edit: true } : undefined);
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (mode === "edit" && selectedId) {
          setMode("view");
        } else {
          setSelectedId(null);
          setMode("view");
          setMessage(null);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showingLead, mode, goAdjacent, selectedId]);

  async function saveForm() {
    setSaving(true);
    setMessage(null);
    const body = bodyFromForm(form);
    try {
      const res = await fetch("/api/admin/marketing/event-leads", {
        method: mode === "edit" && selectedId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "edit" && selectedId ? { id: selectedId, ...body } : body
        )
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Save failed.");
        setSaving(false);
        return;
      }
      setMessage(mode === "edit" ? "Lead updated." : "Lead created.");
      await load();
      if (data.lead?.id) {
        setSelectedId(data.lead.id);
        setMode("view");
      }
    } catch {
      setMessage("Save failed.");
    } finally {
      setSaving(false);
    }
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
      const batch = dataFile.leads || [];
      const res = await fetch("/api/admin/marketing/event-leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importExtracts: true, leads: batch })
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

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <strong>Digital lead cards</strong>
        <p style={{ margin: "8px 0", fontSize: 14, color: "#4b5563" }}>
          QR/link for attendees, or add/edit here. Practice survey defaults to Chris / Coaches /
          Long Beach Expo.
        </p>
        <p style={{ fontSize: 13, marginBottom: 12 }}>
          Practice QR:{" "}
          <a href={practiceUrl} target="_blank" rel="noreferrer">
            {practiceUrl}
          </a>
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="button" onClick={openAdd}>
            Add lead
          </button>
          <button type="button" className="button button-secondary" onClick={() => void load()}>
            Refresh
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

      {(mode === "add" || mode === "edit") && (
        <div className="card" id="event-lead-form" style={{ minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "flex-start"
            }}
          >
            <div>
              <strong>{mode === "add" ? "Add event lead" : "Edit event lead"}</strong>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                {mode === "edit" && selectedIndex >= 0
                  ? `${selectedIndex + 1} of ${leads.length}`
                  : leads.length
                    ? `${leads.length} in list - Next/Previous opens a saved lead`
                    : "No saved leads yet"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="button button-secondary"
                disabled={!canGoPrev}
                onClick={() => goAdjacent(-1, { edit: true })}
                aria-label="Previous lead"
              >
                ← Previous
              </button>
              <button
                type="button"
                className="button button-secondary"
                disabled={!canGoNext}
                onClick={() => goAdjacent(1, { edit: true })}
                aria-label="Next lead"
              >
                Next →
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  if (mode === "edit" && selected) {
                    setMode("view");
                  } else {
                    closeLead();
                    setForm(emptyAddForm());
                  }
                }}
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="event-lead-form-grid">
            <label>
              Form type
              <select
                value={form.formType}
                onChange={(e) => {
                  const formType = e.target.value as EventLeadFormTypeId;
                  setForm((f) => ({
                    ...f,
                    formType,
                    ...(formType === "practice_survey"
                      ? {
                          persona: EXPO_PRACTICE_DEFAULTS.persona,
                          category: EXPO_PRACTICE_DEFAULTS.category,
                          interest: EXPO_PRACTICE_DEFAULTS.interest,
                          entryPath: EXPO_PRACTICE_DEFAULTS.entryPath
                        }
                      : {
                          persona: "Alex - Burned-Out Professional",
                          category: "Individuals & influencers",
                          interest: "Personal membership",
                          entryPath: "Direct"
                        })
                  }));
                }}
              >
                {EVENT_LEAD_FORM_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {EVENT_LEAD_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Event name
              <input
                value={form.eventName}
                onChange={(e) => setForm((f) => ({ ...f, eventName: e.target.value }))}
              />
            </label>
            <label>
              Event dates
              <input
                value={form.eventDates}
                onChange={(e) => setForm((f) => ({ ...f, eventDates: e.target.value }))}
              />
            </label>
            <label>
              Event key
              <input
                value={form.eventKey}
                onChange={(e) => setForm((f) => ({ ...f, eventKey: e.target.value }))}
              />
            </label>
            <label>
              Full name
              <input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </label>
            <label>
              First name
              <input
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </label>
            <label>
              Last name
              <input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </label>
            <label>
              Email
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label>
              Mobile
              <input
                value={form.phoneMobile}
                onChange={(e) => setForm((f) => ({ ...f, phoneMobile: e.target.value }))}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input
                type="checkbox"
                checked={form.smsOk}
                onChange={(e) => setForm((f) => ({ ...f, smsOk: e.target.checked }))}
              />
              TXT OK
            </label>
            <label>
              City
              <input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </label>
            <label>
              State
              <input
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              />
            </label>
            <label>
              Zip
              <input
                value={form.zip}
                onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
              />
            </label>
            <label className="event-lead-form-span">
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
            <label className="event-lead-form-span">
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
            <label>
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
            <label>
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
            <label>
              Captured by
              <input
                value={form.capturedBy}
                onChange={(e) => setForm((f) => ({ ...f, capturedBy: e.target.value }))}
              />
            </label>
            <label>
              Occupation / role
              <input
                value={form.primaryOccupation}
                onChange={(e) => setForm((f) => ({ ...f, primaryOccupation: e.target.value }))}
              />
            </label>
            <label>
              Income goal $
              <input
                value={form.incomeGoalAmount}
                onChange={(e) => setForm((f) => ({ ...f, incomeGoalAmount: e.target.value }))}
              />
            </label>
            <label>
              Income goal year
              <input
                value={form.incomeGoalYear}
                onChange={(e) => setForm((f) => ({ ...f, incomeGoalYear: e.target.value }))}
              />
            </label>
            {form.formType === "practice_survey" ? (
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
                <input
                  type="checkbox"
                  checked={form.wantFullTime}
                  onChange={(e) => setForm((f) => ({ ...f, wantFullTime: e.target.checked }))}
                />
                Want full time
              </label>
            ) : null}
            <div className="event-lead-form-span">
              <label style={{ display: "grid", gap: 4, margin: 0 }}>
                Goal &amp; wellness focus (multi-select)
                <select
                  multiple
                  size={12}
                  value={form.goalInterests}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setForm((f) => ({ ...f, goalInterests: selected }));
                  }}
                  aria-label="Goal and wellness focus areas"
                  style={{ minHeight: 220 }}
                >
                  <optgroup label="Core goals">
                    {EVENT_LEAD_CORE_GOALS.map((goal) => (
                      <option key={`core-${goal}`} value={goal}>
                        {goal}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Wellness focus areas">
                    {EVENT_LEAD_WELLNESS_FOCUS.map((goal) => (
                      <option key={`wellness-${goal}`} value={goal}>
                        {goal}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Lead card goals">
                    {EVENT_LEAD_CARD_GOALS.map((goal) => (
                      <option key={`card-${goal}`} value={goal}>
                        {goal}
                      </option>
                    ))}
                  </optgroup>
                  {goalInterestOptions.length > 0 ? (
                    <optgroup label="Saved custom">
                      {goalInterestOptions.map((goal) => (
                        <option key={`custom-${goal}`} value={goal}>
                          {goal}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6b7280" }}>
                Hold Ctrl (Windows) or Cmd (Mac) to select multiple. Use these to target email
                and outreach for the individual or organization.
                {form.goalInterests.length
                  ? ` Selected: ${form.goalInterests.join(", ")}`
                  : ""}
              </p>
            </div>
          </div>
          <label style={{ display: "block", marginTop: 12 }}>
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}
            />
          </label>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              type="button"
              className="button"
              disabled={saving}
              onClick={() => void saveForm()}
            >
              {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Create lead"}
            </button>
          </div>
        </div>
      )}

      {showingList && (
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
            onClick={() => setFilterEventKey(LONG_BEACH_EXPO_2026.eventKey)}
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
                <tr
                  key={lead.id}
                  onClick={() => openView(lead)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{displayLeadName(lead)}</td>
                  <td>{lead.eventName}</td>
                  <td>{lead.formType}</td>
                  <td>{lead.persona || "-"}</td>
                  <td>{lead.status}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ padding: "4px 8px", fontSize: 12, marginRight: 4 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openView(lead);
                      }}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ padding: "4px 8px", fontSize: 12 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(lead);
                      }}
                    >
                      Edit
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
      )}

      {mode === "view" && selected && (
        <div
          className="card"
          id="event-lead-detail"
          onPointerDown={onLeadPointerDown}
          onPointerUp={onLeadPointerUp}
          onPointerCancel={() => {
            swipeStartX.current = null;
            swipeStartY.current = null;
          }}
          style={{ touchAction: "pan-y", userSelect: "none" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>Digital lead - {displayLeadName(selected)}</strong>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                {selectedIndex + 1} of {leads.length}
                {" · "}
                Swipe or use ← → to move · Esc for list
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="button button-secondary"
                disabled={!canGoPrev}
                onClick={() => goAdjacent(-1)}
              >
                ← Previous
              </button>
              <button
                type="button"
                className="button button-secondary"
                disabled={!canGoNext}
                onClick={() => goAdjacent(1)}
              >
                Next →
              </button>
              <button type="button" className="button" onClick={() => openEdit(selected)}>
                Edit
              </button>
              <button type="button" className="button button-secondary" onClick={closeLead}>
                Back to list
              </button>
            </div>
          </div>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr",
              gap: "6px 12px",
              fontSize: 14,
              marginTop: 12,
              userSelect: "text"
            }}
          >
            <dt>Form</dt>
            <dd>{selected.formType}</dd>
            <dt>Event</dt>
            <dd>
              {selected.eventName}
              {selected.eventDates ? ` (${selected.eventDates})` : ""}
            </dd>
            <dt>Email</dt>
            <dd>{selected.email || "-"}</dd>
            <dt>Mobile</dt>
            <dd>
              {selected.phoneMobile || "-"}
              {selected.smsOk ? " (TXT OK)" : ""}
            </dd>
            <dt>Location</dt>
            <dd>
              {[selected.city, selected.state, selected.zip].filter(Boolean).join(", ") || "-"}
            </dd>
            <dt>Persona</dt>
            <dd>{selected.persona || "-"}</dd>
            <dt>Category</dt>
            <dd>{selected.category || "-"}</dd>
            <dt>Interest</dt>
            <dd>{selected.interest || "-"}</dd>
            <dt>Notes</dt>
            <dd>{selected.notes || "-"}</dd>
            <dt>Scan</dt>
            <dd>
              <code>{selected.sourceScanPath || "-"}</code>
            </dd>
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
          <label style={{ display: "block", marginTop: 12, userSelect: "text" }}>
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
