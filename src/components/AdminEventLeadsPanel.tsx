"use client";

import {
  Fragment,
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
  TERRY_FACILITATOR_REF_CODE,
  TERRY_FACILITATOR_REF_LABEL,
  displayLeadName,
  eventLeadHasScan,
  eventLeadScanHref,
  eventLeadScanReviewDetail,
  eventLeadScanReviewLabel,
  eventLeadScanReviewStatus,
  type EventLeadFormTypeId,
  type EventLeadRecord,
  type EventLeadScanReviewStatus
} from "@/lib/event-leads";
import {
  OUTREACH_CATEGORIES,
  OUTREACH_ENTRY_PATHS,
  OUTREACH_INTERESTS,
  OUTREACH_PERSONAS
} from "@/lib/marketing-reference";
import { adminSectionToggleClass } from "@/components/admin-section-toggle";

type Props = {
  open: boolean;
  onImported?: () => void;
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
  streetAddress: string;
  gender: string;
  age: string;
  incomeLevel: string;
  incomeVsCurrent: string;
  relationshipStatus: string;
  gotHereVia: string;
  businessName: string;
  timezone: string;
  persona: string;
  category: string;
  interest: string;
  entryPath: string;
  refCode: string;
  capturedBy: string;
  notes: string;
  country: string;
  primaryOccupation: string;
  incomeGoalAmount: string;
  incomeGoalYear: string;
  wantFullTime: boolean;
  wantPacket: boolean;
  wantPresentation: boolean;
  goalInterests: string[];
  roles: string;
  statusFlags: string;
  otherTraining: string;
  yearPracticeStarted: string;
  marginNotes: string;
  topPriorities: string;
  spokenWith: string;
  offerCode: string;
  isHypnotherapist: boolean;
  isHealer: boolean;
  isCoach: boolean;
  studyHypnosis: boolean;
};

function EventLeadScanHotLink({
  lead,
  children
}: {
  lead: Pick<EventLeadRecord, "id" | "sourceScanPath">;
  children?: React.ReactNode;
}) {
  const href = eventLeadScanHref(lead, { full: true });
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children ?? lead.sourceScanPath}
    </a>
  );
}

function EventLeadScanCompare({
  lead
}: {
  lead: Pick<EventLeadRecord, "id" | "sourceScanPath">;
}) {
  const href = eventLeadScanHref(lead);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [href]);
  if (!href) return null;
  return (
    <aside className="event-lead-scan-compare">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "baseline"
        }}
      >
        <strong style={{ fontSize: 13 }}>Original scan</strong>
        <EventLeadScanHotLink lead={lead}>Open scan to compare</EventLeadScanHotLink>
      </div>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>
        Open the card beside these fields and correct anything we misread. Save changes or mark as
        corrected so we know who reviewed it.
      </p>
      {failed ? (
        <p style={{ fontSize: 13, color: "#6b7280", margin: "8px 0 0" }}>
          Scan file is not on this server. Keep the JPEG under docs/lead-card-scans to compare
          here.
        </p>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={href}
          alt="Original scanned lead card"
          onError={() => setFailed(true)}
        />
      )}
    </aside>
  );
}

function ScanReviewBanner({ lead }: { lead: EventLeadRecord }) {
  if (!eventLeadHasScan(lead)) return null;
  const status = eventLeadScanReviewStatus(lead);
  const color =
    status === "corrected" ? "#166534" : status === "viewed" ? "#9a3412" : "#9f1239";
  const background =
    status === "corrected" ? "#dcfce7" : status === "viewed" ? "#ffedd5" : "#ffe4e6";
  return (
    <p
      style={{
        margin: "8px 0 0",
        fontSize: 13,
        color,
        background,
        padding: "8px 10px",
        borderRadius: 8
      }}
    >
      {eventLeadScanReviewDetail(lead)}
    </p>
  );
}

function leadPayloadValue(lead: EventLeadRecord, key: string): unknown {
  const practice =
    lead.payload?.practice && typeof lead.payload.practice === "object"
      ? (lead.payload.practice as Record<string, unknown>)
      : {};
  const consumer =
    lead.payload?.consumer && typeof lead.payload.consumer === "object"
      ? (lead.payload.consumer as Record<string, unknown>)
      : {};
  return practice[key] ?? consumer[key];
}

function showField(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (value == null || value === "") return "-";
  return String(value);
}

function leadDetailRows(lead: EventLeadRecord): { label: string; value: string }[] {
  const side = (key: string) => showField(leadPayloadValue(lead, key));
  return [
    { label: "Form", value: showField(lead.formType) },
    { label: "Status", value: showField(lead.status) },
    { label: "Event", value: showField(lead.eventName) },
    { label: "Event dates", value: showField(lead.eventDates) },
    { label: "Event key", value: showField(lead.eventKey) },
    { label: "Full name", value: showField(lead.fullName) },
    { label: "First name", value: showField(lead.firstName) },
    { label: "Last name", value: showField(lead.lastName) },
    { label: "Email", value: showField(lead.email) },
    { label: "Mobile", value: showField(lead.phoneMobile) },
    { label: "Text OK", value: showField(lead.smsOk) },
    { label: "Street address", value: side("streetAddress") },
    { label: "City", value: showField(lead.city) },
    { label: "State", value: showField(lead.state) },
    { label: "Zip", value: showField(lead.zip) },
    { label: "Country", value: showField(lead.country) },
    { label: "Sex", value: side("gender") },
    { label: "Age", value: side("age") },
    { label: "Income level", value: side("incomeLevel") },
    { label: "Income vs current", value: side("incomeVsCurrent") },
    { label: "Income goal $", value: side("incomeGoalAmount") },
    { label: "Income goal year", value: side("incomeGoalYear") },
    { label: "Relationship", value: side("relationshipStatus") },
    { label: "How they got here", value: side("gotHereVia") },
    { label: "Business name", value: side("businessName") },
    { label: "Occupation / role", value: showField(leadPayloadValue(lead, "primaryOccupation") ?? leadPayloadValue(lead, "position")) },
    { label: "Roles", value: side("roles") },
    { label: "Status flags", value: side("statusFlags") },
    { label: "Other training", value: side("otherTraining") },
    { label: "Year practice started", value: side("yearPracticeStarted") },
    { label: "Time zone", value: side("timezone") },
    { label: "Want full time", value: side("wantFullTime") },
    { label: "Packet", value: side("wantPacket") },
    { label: "Presentation", value: side("wantPresentation") },
    { label: "Hypnotherapist", value: side("isHypnotherapist") },
    { label: "Healer", value: side("isHealer") },
    { label: "Coach", value: side("isCoach") },
    { label: "Studying hypnosis", value: side("studyHypnosis") },
    { label: "Top priorities", value: side("topPriorities") },
    { label: "Spoken with", value: side("spokenWith") },
    { label: "Offer code", value: side("offerCode") },
    { label: "Goal interests", value: side("goalInterests") },
    { label: "Margin notes", value: side("marginNotes") },
    { label: "Persona", value: showField(lead.persona) },
    { label: "Category", value: showField(lead.category) },
    { label: "Interest", value: showField(lead.interest) },
    { label: "Entry path", value: showField(lead.entryPath) },
    { label: "Captured by", value: showField(lead.capturedBy) },
    { label: "Notes", value: showField(lead.notes) }
  ];
}

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
    streetAddress: "",
    gender: "",
    age: "",
    incomeLevel: "",
    incomeVsCurrent: "",
    relationshipStatus: "",
    gotHereVia: "",
    businessName: "",
    timezone: "",
    persona: EXPO_PRACTICE_DEFAULTS.persona,
    category: EXPO_PRACTICE_DEFAULTS.category,
    interest: EXPO_PRACTICE_DEFAULTS.interest,
    entryPath: EXPO_PRACTICE_DEFAULTS.entryPath,
    refCode: TERRY_FACILITATOR_REF_CODE,
    capturedBy: "",
    notes: "",
    country: "",
    primaryOccupation: "",
    incomeGoalAmount: "",
    incomeGoalYear: "",
    wantFullTime: false,
    wantPacket: false,
    wantPresentation: false,
    goalInterests: [],
    roles: "",
    statusFlags: "",
    otherTraining: "",
    yearPracticeStarted: "",
    marginNotes: "",
    topPriorities: "",
    spokenWith: "",
    offerCode: "",
    isHypnotherapist: false,
    isHealer: false,
    isCoach: false,
    studyHypnosis: false
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
    streetAddress: String(practice.streetAddress || consumer.streetAddress || ""),
    gender: String(practice.gender || consumer.gender || ""),
    age: String(practice.age || consumer.age || ""),
    incomeLevel: String(practice.incomeLevel || consumer.incomeLevel || ""),
    incomeVsCurrent: String(practice.incomeVsCurrent || consumer.incomeVsCurrent || ""),
    relationshipStatus: String(practice.relationshipStatus || consumer.relationshipStatus || ""),
    gotHereVia: String(practice.gotHereVia || consumer.gotHereVia || ""),
    businessName: String(practice.businessName || consumer.businessName || ""),
    timezone: String(practice.timezone || consumer.timezone || ""),
    persona: lead.persona || "",
    category: lead.category || "",
    interest: lead.interest || "",
    entryPath: lead.entryPath || "",
    refCode: TERRY_FACILITATOR_REF_CODE,
    capturedBy: lead.capturedBy || "",
    notes: lead.notes || "",
    country: lead.country || "",
    primaryOccupation: String(practice.primaryOccupation || consumer.position || ""),
    incomeGoalAmount: String(
      practice.incomeGoalAmount || consumer.incomeGoalAmount || ""
    ),
    incomeGoalYear: String(practice.incomeGoalYear || consumer.incomeGoalYear || ""),
    wantFullTime: Boolean(practice.wantFullTime || consumer.wantFullTime),
    wantPacket: Boolean(practice.wantPacket || consumer.wantPacket),
    wantPresentation: Boolean(practice.wantPresentation || consumer.wantPresentation),
    goalInterests,
    roles: listText(practice.roles ?? consumer.roles),
    statusFlags: listText(practice.statusFlags ?? consumer.statusFlags),
    otherTraining: String(practice.otherTraining || consumer.otherTraining || ""),
    yearPracticeStarted: String(practice.yearPracticeStarted || consumer.yearPracticeStarted || ""),
    marginNotes: String(practice.marginNotes || consumer.marginNotes || ""),
    topPriorities: String(practice.topPriorities || consumer.topPriorities || ""),
    spokenWith: String(practice.spokenWith || consumer.spokenWith || ""),
    offerCode: String(practice.offerCode || consumer.offerCode || ""),
    isHypnotherapist: Boolean(practice.isHypnotherapist || consumer.isHypnotherapist),
    isHealer: Boolean(practice.isHealer || consumer.isHealer),
    isCoach: Boolean(practice.isCoach || consumer.isCoach),
    studyHypnosis: Boolean(practice.studyHypnosis || consumer.studyHypnosis)
  };
}

function listText(value: unknown): string {
  if (!Array.isArray(value)) return value == null ? "" : String(value);
  return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
}

function textList(value: string): string[] | null {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

function cardVariantFromForm(form: LeadFormState) {
  return {
    streetAddress: form.streetAddress.trim() || null,
    gender: form.gender.trim() || null,
    age: form.age.trim() || null,
    incomeLevel: form.incomeLevel.trim() || null,
    incomeVsCurrent: form.incomeVsCurrent.trim() || null,
    relationshipStatus: form.relationshipStatus.trim() || null,
    gotHereVia: form.gotHereVia.trim() || null,
    businessName: form.businessName.trim() || null,
    timezone: form.timezone.trim() || null,
    roles: textList(form.roles),
    statusFlags: textList(form.statusFlags),
    otherTraining: form.otherTraining.trim() || null,
    yearPracticeStarted: form.yearPracticeStarted.trim() || null,
    wantFullTime: form.wantFullTime,
    wantPacket: form.wantPacket,
    wantPresentation: form.wantPresentation,
    marginNotes: form.marginNotes.trim() || null,
    topPriorities: form.topPriorities.trim() || null,
    spokenWith: form.spokenWith.trim() || null,
    offerCode: form.offerCode.trim() || null,
    isHypnotherapist: form.isHypnotherapist,
    isHealer: form.isHealer,
    isCoach: form.isCoach,
    studyHypnosis: form.studyHypnosis
  };
}

function asPayloadRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function payloadFromForm(form: LeadFormState, existing?: Record<string, unknown> | null) {
  const variant = cardVariantFromForm(form);
  const prevPractice = asPayloadRecord(existing?.practice);
  const prevConsumer = asPayloadRecord(existing?.consumer);
  if (form.formType === "practice_survey") {
    return {
      practice: {
        ...prevPractice,
        primaryOccupation: form.primaryOccupation.trim() || null,
        incomeGoalAmount: form.incomeGoalAmount.trim() || null,
        incomeGoalYear: form.incomeGoalYear.trim() || null,
        wantFullTime: form.wantFullTime,
        wantTxt: form.smsOk,
        goalInterests: form.goalInterests,
        ...variant
      },
      consumer: Object.keys(prevConsumer).length ? prevConsumer : null
    };
  }
  return {
    practice: Object.keys(prevPractice).length ? prevPractice : null,
    consumer: {
      ...prevConsumer,
      offerCode:
        typeof prevConsumer.offerCode === "string" && prevConsumer.offerCode.trim()
          ? prevConsumer.offerCode
          : "abundance-magnet",
      goalInterests: form.goalInterests,
      incomeGoalAmount: form.incomeGoalAmount.trim() || null,
      incomeGoalYear: form.incomeGoalYear.trim() || null,
      position: form.primaryOccupation.trim() || null,
      ...variant
    }
  };
}

function bodyFromForm(form: LeadFormState, existing?: Record<string, unknown> | null) {
  const extras = payloadFromForm(form, existing);
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
    country: form.country.trim() || null,
    streetAddress: form.streetAddress.trim() || null,
    persona: form.persona.trim() || null,
    category: form.category.trim() || null,
    interest: form.interest.trim() || null,
    entryPath: form.entryPath.trim() || null,
    refCode: form.refCode.trim() || TERRY_FACILITATOR_REF_CODE,
    capturedBy: form.capturedBy.trim() || null,
    notes: form.notes.trim() || null,
    autoReply: false,
    ...extras
  };
}

export default function AdminEventLeadsPanel({ open, onImported }: Props) {
  const [leads, setLeads] = useState<EventLeadRecord[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterEventKey, setFilterEventKey] = useState("");
  const [mode, setMode] = useState<"view" | "edit" | "add">("view");
  const [form, setForm] = useState<LeadFormState>(emptyAddForm);
  type LeadSubKey = "cards" | "importDb" | "list";
  const [openSubs, setOpenSubs] = useState<Record<LeadSubKey, boolean>>({
    cards: false,
    importDb: false,
    list: false
  });
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanReviewFilter, setScanReviewFilter] = useState<
    "all" | EventLeadScanReviewStatus
  >("all");

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

  const leadsRef = useRef(leads);
  leadsRef.current = leads;

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!selectedId) return;
    if (mode !== "view" && mode !== "edit") return;
    const current = leadsRef.current.find((row) => row.id === selectedId);
    if (!current || !eventLeadHasScan(current)) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/admin/marketing/event-leads", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId, markScanViewed: true })
      });
      if (cancelled || !res.ok) return;
      const data = await res.json().catch(() => ({}));
      if (data.lead) {
        setLeads((prev) =>
          prev.map((row) => (row.id === data.lead.id ? (data.lead as EventLeadRecord) : row))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, mode]);

  const selectedIndex = useMemo(
    () => (selectedId ? leads.findIndex((l) => l.id === selectedId) : -1),
    [leads, selectedId]
  );
  const selected = selectedIndex >= 0 ? leads[selectedIndex] : null;
  const showingLead = Boolean(selectedId) && (mode === "view" || mode === "edit");
  const showingList = !showingLead && mode !== "add";
  const visibleLeads = useMemo(() => {
    if (scanReviewFilter === "all") return leads;
    return leads.filter((lead) => eventLeadScanReviewStatus(lead) === scanReviewFilter);
  }, [leads, scanReviewFilter]);
  const needsReviewCount = useMemo(
    () => leads.filter((lead) => eventLeadScanReviewStatus(lead) === "needs_review").length,
    [leads]
  );

  function mergeLead(next: EventLeadRecord) {
    setLeads((prev) => prev.map((row) => (row.id === next.id ? next : row)));
  }

  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);

  function openAdd() {
    setMode("add");
    setSelectedId(null);
    setForm(emptyAddForm());
    setMessage(null);
    setOpenSubs((prev) => ({ ...prev, cards: true }));
  }

  function toggleSub(key: LeadSubKey) {
    setOpenSubs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function importDatabaseFromFile(file: File) {
    setImportBusy(true);
    setMessage(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/admin/marketing/event-leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importDatabase: true, text })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Database import failed.");
        return;
      }
      setMessage(
        `Imported ${data.imported ?? 0}, skipped ${data.skipped ?? 0}, errors ${data.errors ?? 0}. Referral default: ${TERRY_FACILITATOR_REF_CODE}.`
      );
      setOpenSubs((prev) => ({ ...prev, list: true }));
      await load();
      if ((data.imported ?? 0) > 0) onImported?.();
    } catch {
      setMessage("Database import failed.");
    } finally {
      setImportBusy(false);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  }

  async function exportLeadsCsv() {
    setExportBusy(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({ dataset: "event_leads", format: "csv" });
      if (filterEventKey.trim()) params.set("eventKey", filterEventKey.trim());
      const res = await fetch(`/api/admin/marketing/crm-export?${params.toString()}`, {
        credentials: "include",
        cache: "no-store"
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(typeof data.error === "string" ? data.error : "Export failed.");
        return;
      }
      const blob = await res.blob();
      const header = res.headers.get("Content-Disposition") || "";
      const match = /filename="([^"]+)"/i.exec(header);
      const filename = match?.[1] || "rfts-crm-event-leads.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage(`Downloaded ${filename}.`);
    } catch {
      setMessage("Export failed.");
    } finally {
      setExportBusy(false);
    }
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

  function openLead(lead: EventLeadRecord) {
    if (eventLeadHasScan(lead)) {
      openEdit(lead);
      return;
    }
    openView(lead);
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
    const body = bodyFromForm(form, selected?.payload ?? null);
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
      setMessage(
        mode === "edit"
          ? eventLeadHasScan(data.lead)
            ? "Lead updated and marked as corrected."
            : "Lead updated."
          : "Lead created."
      );
      if (mode === "add") onImported?.();
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
      const extractsRes = await fetch(
        `/api/admin/marketing/event-leads?extracts=long-beach-2026-08`,
        { credentials: "include", cache: "no-store" }
      );
      if (!extractsRes.ok) {
        setMessage(
          "Extracts file not found (admin API → docs/lead-card-scans/long-beach-2026-08/extracts.json)."
        );
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
      if ((data.imported ?? 0) > 0) onImported?.();
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

  async function markScanCorrected(id: string) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/marketing/event-leads", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, markScanCorrected: true })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Could not mark as corrected.");
        return;
      }
      if (data.lead) mergeLead(data.lead as EventLeadRecord);
      setMessage("Marked as corrected.");
    } catch {
      setMessage("Could not mark as corrected.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const practiceUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/lead/practice?key=${encodeURIComponent(LONG_BEACH_EXPO_2026.eventKey)}`
      : `/lead/practice?key=${LONG_BEACH_EXPO_2026.eventKey}`;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={{ margin: 0, fontSize: 13, color: "#4b5563" }}>
        Event leads sync into Outreach. Default referral code:{" "}
        <strong>{TERRY_FACILITATOR_REF_LABEL}</strong> unless you set another.
      </p>

      <div>
        <button
          type="button"
          className={adminSectionToggleClass(openSubs.cards, true)}
          aria-expanded={openSubs.cards}
          onClick={() => toggleSub("cards")}
        >
          {openSubs.cards ? "▼" : "▶"} Digital lead cards
        </button>
        {openSubs.cards ? (
          <div className="card" style={{ marginTop: 10 }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#4b5563" }}>
              QR/link for attendees, or add/edit here. Practice survey defaults to Chris / Coaches /
              Long Beach Expo. Referral defaults to Terry as facilitator.
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
                Import Long Beach extracts JSON
              </button>
            </div>
            {message && <p style={{ marginTop: 10, fontSize: 14 }}>{message}</p>}
          </div>
        ) : null}
      </div>

      <div>
        <button
          type="button"
          className={adminSectionToggleClass(openSubs.importDb, true)}
          aria-expanded={openSubs.importDb}
          onClick={() => toggleSub("importDb")}
        >
          {openSubs.importDb ? "▼" : "▶"} Import lead database
        </button>
        {openSubs.importDb ? (
          <div className="card" style={{ marginTop: 10 }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#4b5563" }}>
              Upload a CSV, TSV, or JSON export (columns like name, email, phone, city, notes).
              Missing referral codes get Terry&apos;s facilitator code ({TERRY_FACILITATOR_REF_CODE}).
              Duplicates by email + event are skipped. AWeber subscriber lists belong under
              Import outreach database, not here.
            </p>
            <input
              ref={importFileRef}
              type="file"
              accept=".csv,.tsv,.txt,.json,text/csv,application/json"
              disabled={importBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importDatabaseFromFile(file);
              }}
            />
            {importBusy ? (
              <p style={{ marginTop: 8, fontSize: 13 }}>Importing…</p>
            ) : null}
            {message && openSubs.importDb ? (
              <p style={{ marginTop: 10, fontSize: 14 }}>{message}</p>
            ) : null}
          </div>
        ) : null}
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
              {mode === "edit" && selected ? <ScanReviewBanner lead={selected} /> : null}
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
              {mode === "edit" && selected && eventLeadHasScan(selected) ? (
                <a
                  href={eventLeadScanHref(selected, { full: true }) || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button"
                  style={{ textDecoration: "none" }}
                >
                  Open scan to compare
                </a>
              ) : null}
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
          <div className="event-lead-compare">
          <div>
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
              Street address
              <input
                value={form.streetAddress}
                onChange={(e) => setForm((f) => ({ ...f, streetAddress: e.target.value }))}
              />
            </label>
            <label>
              Sex
              <input
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              />
            </label>
            <label>
              Age
              <input
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              />
            </label>
            <label>
              Income level
              <input
                value={form.incomeLevel}
                onChange={(e) => setForm((f) => ({ ...f, incomeLevel: e.target.value }))}
              />
            </label>
            <label>
              Income vs current
              <input
                value={form.incomeVsCurrent}
                onChange={(e) => setForm((f) => ({ ...f, incomeVsCurrent: e.target.value }))}
              />
            </label>
            <label>
              Relationship
              <input
                value={form.relationshipStatus}
                onChange={(e) => setForm((f) => ({ ...f, relationshipStatus: e.target.value }))}
              />
            </label>
            <label>
              How they got here
              <input
                value={form.gotHereVia}
                onChange={(e) => setForm((f) => ({ ...f, gotHereVia: e.target.value }))}
              />
            </label>
            <label>
              Business name
              <input
                value={form.businessName}
                onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
              />
            </label>
            <label>
              Time zone
              <input
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              />
            </label>
            <label>
              Country
              <input
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              />
            </label>
            <label>
              Roles
              <input
                value={form.roles}
                onChange={(e) => setForm((f) => ({ ...f, roles: e.target.value }))}
                placeholder="Healer, Coach"
              />
            </label>
            <label>
              Status flags
              <input
                value={form.statusFlags}
                onChange={(e) => setForm((f) => ({ ...f, statusFlags: e.target.value }))}
              />
            </label>
            <label>
              Other training
              <input
                value={form.otherTraining}
                onChange={(e) => setForm((f) => ({ ...f, otherTraining: e.target.value }))}
              />
            </label>
            <label>
              Year practice started
              <input
                value={form.yearPracticeStarted}
                onChange={(e) => setForm((f) => ({ ...f, yearPracticeStarted: e.target.value }))}
              />
            </label>
            <label>
              Top priorities
              <input
                value={form.topPriorities}
                onChange={(e) => setForm((f) => ({ ...f, topPriorities: e.target.value }))}
              />
            </label>
            <label>
              Spoken with
              <input
                value={form.spokenWith}
                onChange={(e) => setForm((f) => ({ ...f, spokenWith: e.target.value }))}
              />
            </label>
            <label>
              Offer code
              <input
                value={form.offerCode}
                onChange={(e) => setForm((f) => ({ ...f, offerCode: e.target.value }))}
              />
            </label>
            <label className="event-lead-form-span">
              Margin notes
              <input
                value={form.marginNotes}
                onChange={(e) => setForm((f) => ({ ...f, marginNotes: e.target.value }))}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input
                type="checkbox"
                checked={form.wantPacket}
                onChange={(e) => setForm((f) => ({ ...f, wantPacket: e.target.checked }))}
              />
              Packet
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input
                type="checkbox"
                checked={form.wantPresentation}
                onChange={(e) => setForm((f) => ({ ...f, wantPresentation: e.target.checked }))}
              />
              Presentation
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input
                type="checkbox"
                checked={form.isHypnotherapist}
                onChange={(e) => setForm((f) => ({ ...f, isHypnotherapist: e.target.checked }))}
              />
              Hypnotherapist
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input
                type="checkbox"
                checked={form.isHealer}
                onChange={(e) => setForm((f) => ({ ...f, isHealer: e.target.checked }))}
              />
              Healer
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input
                type="checkbox"
                checked={form.isCoach}
                onChange={(e) => setForm((f) => ({ ...f, isCoach: e.target.checked }))}
              />
              Coach
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input
                type="checkbox"
                checked={form.studyHypnosis}
                onChange={(e) => setForm((f) => ({ ...f, studyHypnosis: e.target.checked }))}
              />
              Studying hypnosis
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
              Referral / facilitator code
              <input
                value={form.refCode}
                onChange={(e) => setForm((f) => ({ ...f, refCode: e.target.value }))}
                placeholder={TERRY_FACILITATOR_REF_CODE}
              />
              <span style={{ display: "block", fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                Default: Terry Brussel-Rogers facilitator ({TERRY_FACILITATOR_REF_CODE})
              </span>
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
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input
                type="checkbox"
                checked={form.wantFullTime}
                onChange={(e) => setForm((f) => ({ ...f, wantFullTime: e.target.checked }))}
              />
              Want full time
            </label>
          </div>
          <div className="event-lead-goals-row">
            <div>
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
                  style={{ minHeight: 420 }}
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
            {mode === "edit" && selected && eventLeadHasScan(selected) ? (
              <EventLeadScanCompare lead={selected} />
            ) : null}
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
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="button"
              disabled={saving}
              onClick={() => void saveForm()}
            >
              {saving
                ? "Saving…"
                : mode === "edit"
                  ? eventLeadHasScan(selected)
                    ? "Save and mark corrected"
                    : "Save changes"
                  : "Create lead"}
            </button>
          </div>
          </div>
          </div>
        </div>
      )}

      {showingList && (
      <div>
        <button
          type="button"
          className={adminSectionToggleClass(openSubs.list, true)}
          aria-expanded={openSubs.list}
          onClick={() => toggleSub("list")}
        >
          {openSubs.list ? "▼" : "▶"} Saved event leads ({leads.length}
          {needsReviewCount ? ` · ${needsReviewCount} need scan review` : ""}
          {status === "loading" ? "…" : ""})
        </button>
        {openSubs.list ? (
      <div className="card" style={{ marginTop: 10 }}>
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
            disabled={exportBusy}
            onClick={() => void exportLeadsCsv()}
          >
            {exportBusy ? "Exporting…" : "Export CSV"}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setFilterEventKey(LONG_BEACH_EXPO_2026.eventKey)}
          >
            Long Beach Expo key
          </button>
          <select
            aria-label="Filter scan review"
            value={scanReviewFilter}
            onChange={(e) =>
              setScanReviewFilter(e.target.value as "all" | EventLeadScanReviewStatus)
            }
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
          >
            <option value="all">All scan reviews</option>
            <option value="needs_review">Needs review</option>
            <option value="viewed">Viewed, not corrected</option>
            <option value="corrected">Corrected</option>
            <option value="none">No scan (digital)</option>
          </select>
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
                <th>Scan review</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => openLead(lead)}
                  style={{
                    cursor: "pointer",
                    background:
                      eventLeadScanReviewStatus(lead) === "needs_review" ? "#fff1f2" : undefined
                  }}
                >
                  <td>{displayLeadName(lead)}</td>
                  <td>{lead.eventName}</td>
                  <td>{lead.formType}</td>
                  <td>{lead.persona || "-"}</td>
                  <td>{lead.status}</td>
                  <td style={{ fontSize: 13, color: "#4b5563" }}>
                    {eventLeadScanReviewLabel(lead)}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {eventLeadHasScan(lead) ? (
                      <a
                        href={eventLeadScanHref(lead, { full: true }) || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button-secondary"
                        style={{
                          padding: "4px 8px",
                          fontSize: 12,
                          marginRight: 4,
                          textDecoration: "none"
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Scan
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ padding: "4px 8px", fontSize: 12, marginRight: 4 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openLead(lead);
                      }}
                    >
                      {eventLeadHasScan(lead) ? "Compare & edit" : "View"}
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
              {visibleLeads.length === 0 && status !== "loading" && (
                <tr>
                  <td colSpan={7}>
                    {leads.length === 0
                      ? "No event leads yet."
                      : "No event leads match this scan review filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        ) : null}
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
              <strong>
                {eventLeadHasScan(selected) ? "Scanned lead" : "Digital lead"} -{" "}
                {displayLeadName(selected)}
              </strong>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                {selectedIndex + 1} of {leads.length}
                {" · "}
                Swipe or use ← → to move · Esc for list
              </div>
              <ScanReviewBanner lead={selected} />
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
              {eventLeadHasScan(selected) ? (
                <a
                  href={eventLeadScanHref(selected, { full: true }) || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-secondary"
                  style={{ textDecoration: "none" }}
                >
                  Open scan to compare
                </a>
              ) : null}
              {eventLeadHasScan(selected) && eventLeadScanReviewStatus(selected) !== "corrected" ? (
                <button
                  type="button"
                  className="button"
                  disabled={saving}
                  onClick={() => void markScanCorrected(selected.id)}
                >
                  {saving ? "Saving…" : "Mark as corrected"}
                </button>
              ) : null}
              <button type="button" className="button button-secondary" onClick={closeLead}>
                Back to list
              </button>
            </div>
          </div>
          <div className="event-lead-compare">
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr",
              gap: "6px 12px",
              fontSize: 14,
              marginTop: 0,
              userSelect: "text"
            }}
          >
            {leadDetailRows(selected).map((row) => (
              <Fragment key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </Fragment>
            ))}
            <dt>Scan review</dt>
            <dd>{eventLeadScanReviewDetail(selected) || "-"}</dd>
            <dt>Scan</dt>
            <dd>
              {eventLeadHasScan(selected) ? (
                <EventLeadScanHotLink lead={selected} />
              ) : (
                "-"
              )}
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
          {eventLeadHasScan(selected) ? <EventLeadScanCompare lead={selected} /> : null}
          </div>
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
