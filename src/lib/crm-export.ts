import {
  listAllOutreachActivities,
  listAllOutreachContacts,
  listOutreachEmailTemplates,
  listOutreachTargets,
  type OutreachActivity,
  type OutreachContact,
  type OutreachEmailTemplate,
  type OutreachTarget
} from "@/lib/db";
import { listAllMarketingEmailEvents, type MarketingEmailEvent } from "@/lib/email-delivery-events";
import { listAllEventLeads } from "@/lib/event-leads-db";
import type { EventLeadRecord } from "@/lib/event-leads";

export const CRM_EXPORT_DATASETS = [
  "all",
  "flat",
  "targets",
  "contacts",
  "activities",
  "event_leads",
  "email_events",
  "templates"
] as const;

export type CrmExportDataset = (typeof CRM_EXPORT_DATASETS)[number];

export type CrmExportQuery = {
  dataset: CrmExportDataset;
  /** Outreach target status, `all`, or `due` (follow-up within 7 days). */
  status?: string | null;
  doNotEmail?: boolean | null;
  eventKey?: string | null;
  formType?: string | null;
  eventStatus?: string | null;
  q?: string | null;
};

export type CrmExportTables = {
  targets: OutreachTarget[];
  contacts: OutreachContact[];
  activities: OutreachActivity[];
  eventLeads: EventLeadRecord[];
  emailEvents: MarketingEmailEvent[];
  templates: OutreachEmailTemplate[];
};

export type FlatCrmRow = {
  targetId: string;
  organization: string;
  targetType: string;
  category: string | null;
  persona: string | null;
  entryPath: string | null;
  targetContact: string | null;
  refCode: string | null;
  status: string;
  notes: string | null;
  interest: string | null;
  audienceSize: string | null;
  decisionTimeline: string | null;
  followUpAt: string | null;
  doNotEmail: boolean;
  targetCreatedAt: string;
  targetUpdatedAt: string;
  contactId: string | null;
  contactName: string | null;
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
  contactNotes: string | null;
  isPrimary: boolean | null;
  contactCreatedAt: string | null;
};

export const CRM_EXPORT_COLUMNS: Record<Exclude<CrmExportDataset, "all">, string[]> = {
  targets: [
    "id",
    "organization",
    "targetType",
    "category",
    "persona",
    "entryPath",
    "contact",
    "refCode",
    "status",
    "notes",
    "interest",
    "audienceSize",
    "decisionTimeline",
    "followUpAt",
    "doNotEmail",
    "createdAt",
    "updatedAt"
  ],
  contacts: [
    "id",
    "targetId",
    "name",
    "firstName",
    "lastName",
    "email",
    "phone",
    "phoneMobile",
    "roleTitle",
    "preferredTimes",
    "linkedinUrl",
    "instagramUrl",
    "facebookUrl",
    "xUrl",
    "websiteUrl",
    "notes",
    "isPrimary",
    "createdAt",
    "updatedAt"
  ],
  activities: [
    "id",
    "targetId",
    "contactId",
    "kind",
    "subject",
    "bodyPreview",
    "meta",
    "createdByEmail",
    "createdAt"
  ],
  event_leads: [
    "id",
    "formType",
    "status",
    "eventName",
    "eventDates",
    "eventKey",
    "firstName",
    "lastName",
    "fullName",
    "email",
    "phoneMobile",
    "smsOk",
    "city",
    "state",
    "zip",
    "country",
    "persona",
    "category",
    "interest",
    "entryPath",
    "capturedBy",
    "notes",
    "sourceScanPath",
    "payload",
    "outreachTargetId",
    "autoReplySentAt",
    "createdAt",
    "updatedAt"
  ],
  email_events: [
    "id",
    "provider",
    "eventType",
    "svixId",
    "resendEmailId",
    "recipientEmail",
    "subject",
    "bounceType",
    "bounceSubtype",
    "message",
    "outreachTargetsUpdated",
    "createdAt"
  ],
  templates: ["id", "name", "subject", "bodyText", "purpose", "createdAt", "updatedAt"],
  flat: [
    "targetId",
    "organization",
    "targetType",
    "category",
    "persona",
    "entryPath",
    "targetContact",
    "refCode",
    "status",
    "notes",
    "interest",
    "audienceSize",
    "decisionTimeline",
    "followUpAt",
    "doNotEmail",
    "targetCreatedAt",
    "targetUpdatedAt",
    "contactId",
    "contactName",
    "firstName",
    "lastName",
    "email",
    "phone",
    "phoneMobile",
    "roleTitle",
    "preferredTimes",
    "linkedinUrl",
    "instagramUrl",
    "facebookUrl",
    "xUrl",
    "websiteUrl",
    "contactNotes",
    "isPrimary",
    "contactCreatedAt"
  ]
};

const DATASET_FILE_SLUG: Record<Exclude<CrmExportDataset, "all">, string> = {
  flat: "flat",
  targets: "targets",
  contacts: "contacts",
  activities: "activities",
  event_leads: "event-leads",
  email_events: "email-events",
  templates: "templates"
};

export function csvEscapeCell(cell: string): string {
  if (/[",\r\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export function serializeCsvValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function recordsToCsv(
  rows: Array<Record<string, unknown>>,
  columns: string[]
): string {
  const header = columns.map(csvEscapeCell).join(",");
  const lines = rows.map((row) =>
    columns.map((col) => csvEscapeCell(serializeCsvValue(row[col]))).join(",")
  );
  return [header, ...lines].join("\r\n") + (rows.length ? "\r\n" : "");
}

function matchesQ(values: unknown[], q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return values.some((v) => v != null && String(v).toLowerCase().includes(needle));
}

function isDueThisWeek(followUpAt: string | null | undefined, nowMs: number): boolean {
  if (!followUpAt) return false;
  const ms = Date.parse(followUpAt);
  return !Number.isNaN(ms) && ms <= nowMs + 7 * 86400000;
}

export function filterOutreachTargets(
  targets: OutreachTarget[],
  query: Pick<CrmExportQuery, "status" | "doNotEmail" | "q">,
  nowMs = Date.now()
): OutreachTarget[] {
  const status = (query.status || "all").trim() || "all";
  const q = query.q?.trim() || "";
  return targets.filter((t) => {
    if (status === "due" && !isDueThisWeek(t.followUpAt, nowMs)) return false;
    if (status !== "all" && status !== "due" && t.status !== status) return false;
    if (query.doNotEmail === true && !t.doNotEmail) return false;
    if (query.doNotEmail === false && t.doNotEmail) return false;
    if (
      q &&
      !matchesQ(
        [t.organization, t.contact, t.notes, t.persona, t.category, t.refCode, t.interest],
        q
      )
    ) {
      return false;
    }
    return true;
  });
}

export function filterEventLeads(
  leads: EventLeadRecord[],
  query: Pick<CrmExportQuery, "eventKey" | "formType" | "eventStatus" | "q">
): EventLeadRecord[] {
  const eventKey = query.eventKey?.trim() || "";
  const formType = query.formType?.trim() || "";
  const eventStatus = query.eventStatus?.trim() || "";
  const q = query.q?.trim() || "";
  return leads.filter((lead) => {
    if (eventKey && (lead.eventKey || "") !== eventKey) return false;
    if (formType && lead.formType !== formType) return false;
    if (eventStatus && lead.status !== eventStatus) return false;
    if (
      q &&
      !matchesQ(
        [
          lead.fullName,
          lead.firstName,
          lead.lastName,
          lead.email,
          lead.eventName,
          lead.eventKey,
          lead.notes,
          lead.phoneMobile,
          lead.city
        ],
        q
      )
    ) {
      return false;
    }
    return true;
  });
}

export function buildFlatContactRows(
  targets: OutreachTarget[],
  contacts: OutreachContact[]
): FlatCrmRow[] {
  const byTarget = new Map<string, OutreachContact[]>();
  for (const contact of contacts) {
    const list = byTarget.get(contact.targetId) ?? [];
    list.push(contact);
    byTarget.set(contact.targetId, list);
  }
  const rows: FlatCrmRow[] = [];
  for (const target of targets) {
    const people = byTarget.get(target.id) ?? [];
    if (!people.length) {
      rows.push(flatRowFromTarget(target, null));
      continue;
    }
    for (const contact of people) {
      rows.push(flatRowFromTarget(target, contact));
    }
  }
  return rows;
}

function flatRowFromTarget(
  target: OutreachTarget,
  contact: OutreachContact | null
): FlatCrmRow {
  return {
    targetId: target.id,
    organization: target.organization,
    targetType: target.targetType,
    category: target.category,
    persona: target.persona,
    entryPath: target.entryPath,
    targetContact: target.contact,
    refCode: target.refCode,
    status: target.status,
    notes: target.notes,
    interest: target.interest,
    audienceSize: target.audienceSize,
    decisionTimeline: target.decisionTimeline,
    followUpAt: target.followUpAt,
    doNotEmail: target.doNotEmail,
    targetCreatedAt: target.createdAt,
    targetUpdatedAt: target.updatedAt,
    contactId: contact?.id ?? null,
    contactName: contact?.name ?? null,
    firstName: contact?.firstName ?? null,
    lastName: contact?.lastName ?? null,
    email: contact?.email ?? null,
    phone: contact?.phone ?? null,
    phoneMobile: contact?.phoneMobile ?? null,
    roleTitle: contact?.roleTitle ?? null,
    preferredTimes: contact?.preferredTimes ?? null,
    linkedinUrl: contact?.linkedinUrl ?? null,
    instagramUrl: contact?.instagramUrl ?? null,
    facebookUrl: contact?.facebookUrl ?? null,
    xUrl: contact?.xUrl ?? null,
    websiteUrl: contact?.websiteUrl ?? null,
    contactNotes: contact?.notes ?? null,
    isPrimary: contact ? contact.isPrimary : null,
    contactCreatedAt: contact?.createdAt ?? null
  };
}

export function applyCrmExportQuery(
  tables: CrmExportTables,
  query: CrmExportQuery,
  nowMs = Date.now()
): CrmExportTables {
  const dataset = query.dataset;
  const q = query.q?.trim() || "";
  const targetScoped =
    Boolean(query.status && query.status !== "all") || query.doNotEmail != null;

  const applyTargetQ = dataset === "targets" || dataset === "flat" || dataset === "all";
  let targets = filterOutreachTargets(
    tables.targets,
    {
      status: query.status,
      doNotEmail: query.doNotEmail,
      q: applyTargetQ ? q : ""
    },
    nowMs
  );

  let contacts = tables.contacts;
  let activities = tables.activities;

  if (targetScoped || dataset === "flat" || dataset === "targets") {
    const ids = new Set(targets.map((t) => t.id));
    contacts = contacts.filter((c) => ids.has(c.targetId));
    activities = activities.filter((a) => ids.has(a.targetId));
  }

  if (q && (dataset === "contacts" || dataset === "all")) {
    contacts = contacts.filter((c) =>
      matchesQ(
        [c.name, c.firstName, c.lastName, c.email, c.phone, c.phoneMobile, c.notes],
        q
      )
    );
  }
  if (q && (dataset === "activities" || dataset === "all")) {
    activities = activities.filter((a) =>
      matchesQ([a.kind, a.subject, a.bodyPreview, a.createdByEmail], q)
    );
  }

  const applyLeadFilters =
    dataset === "event_leads" || dataset === "all";
  const eventLeads = applyLeadFilters
    ? filterEventLeads(tables.eventLeads, query)
    : tables.eventLeads;

  let emailEvents = tables.emailEvents;
  if (q && (dataset === "email_events" || dataset === "all")) {
    emailEvents = emailEvents.filter((ev) =>
      matchesQ([ev.recipientEmail, ev.subject, ev.message, ev.eventType], q)
    );
  }

  let templates = tables.templates;
  if (q && (dataset === "templates" || dataset === "all")) {
    templates = templates.filter((t) =>
      matchesQ([t.name, t.subject, t.bodyText, t.purpose], q)
    );
  }

  if (q && dataset === "flat") {
    const ids = new Set(targets.map((t) => t.id));
    contacts = contacts.filter((c) => ids.has(c.targetId));
    const flat = buildFlatContactRows(targets, contacts).filter((row) =>
      matchesQ(
        [
          row.organization,
          row.targetContact,
          row.contactName,
          row.email,
          row.phoneMobile,
          row.notes,
          row.contactNotes,
          row.refCode
        ],
        q
      )
    );
    const keepTargetIds = new Set(flat.map((r) => r.targetId));
    const keepContactIds = new Set(flat.map((r) => r.contactId).filter(Boolean));
    targets = targets.filter((t) => keepTargetIds.has(t.id));
    contacts = contacts.filter(
      (c) => keepTargetIds.has(c.targetId) && keepContactIds.has(c.id)
    );
  }

  return {
    targets,
    contacts,
    activities,
    eventLeads,
    emailEvents,
    templates
  };
}

export function rowsForDataset(
  tables: CrmExportTables,
  dataset: Exclude<CrmExportDataset, "all">
): Array<Record<string, unknown>> {
  if (dataset === "flat") {
    return buildFlatContactRows(tables.targets, tables.contacts) as unknown as Array<
      Record<string, unknown>
    >;
  }
  if (dataset === "targets") return tables.targets as unknown as Array<Record<string, unknown>>;
  if (dataset === "contacts") return tables.contacts as unknown as Array<Record<string, unknown>>;
  if (dataset === "activities") {
    return tables.activities as unknown as Array<Record<string, unknown>>;
  }
  if (dataset === "event_leads") {
    return tables.eventLeads as unknown as Array<Record<string, unknown>>;
  }
  if (dataset === "email_events") {
    return tables.emailEvents as unknown as Array<Record<string, unknown>>;
  }
  return tables.templates as unknown as Array<Record<string, unknown>>;
}

export function crmExportDateStamp(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function crmExportFilename(
  dataset: CrmExportDataset,
  format: "csv" | "json",
  now = new Date()
): string {
  const stamp = crmExportDateStamp(now);
  if (dataset === "all") return `rfts-crm-all-${stamp}.${format === "csv" ? "json" : format}`;
  return `rfts-crm-${dataset.replace(/_/g, "-")}-${stamp}.${format}`;
}

export type CrmExportFile = {
  filename: string;
  csv: string;
  rowCount: number;
};

export function buildCrmCsvFiles(
  tables: CrmExportTables,
  now = new Date()
): CrmExportFile[] {
  const stamp = crmExportDateStamp(now);
  const datasets: Array<Exclude<CrmExportDataset, "all">> = [
    "flat",
    "targets",
    "contacts",
    "activities",
    "event_leads",
    "email_events",
    "templates"
  ];
  return datasets.map((dataset) => {
    const rows = rowsForDataset(tables, dataset);
    return {
      filename: `rfts-crm-${DATASET_FILE_SLUG[dataset]}-${stamp}.csv`,
      csv: recordsToCsv(rows, CRM_EXPORT_COLUMNS[dataset]),
      rowCount: rows.length
    };
  });
}

export type CrmExportResult = {
  generatedAt: string;
  query: CrmExportQuery;
  tables: CrmExportTables;
  counts: Record<keyof CrmExportTables | "flat", number>;
};

export async function loadCrmExportTables(): Promise<CrmExportTables> {
  const [targets, contacts, activities, eventLeads, emailEvents, templates] =
    await Promise.all([
      listOutreachTargets(),
      listAllOutreachContacts(),
      listAllOutreachActivities(),
      listAllEventLeads(),
      listAllMarketingEmailEvents(),
      listOutreachEmailTemplates()
    ]);
  return { targets, contacts, activities, eventLeads, emailEvents, templates };
}

export async function buildCrmExport(
  query: CrmExportQuery,
  nowMs = Date.now()
): Promise<CrmExportResult> {
  const tables = applyCrmExportQuery(await loadCrmExportTables(), query, nowMs);
  return {
    generatedAt: new Date(nowMs).toISOString(),
    query,
    tables,
    counts: {
      targets: tables.targets.length,
      contacts: tables.contacts.length,
      activities: tables.activities.length,
      eventLeads: tables.eventLeads.length,
      emailEvents: tables.emailEvents.length,
      templates: tables.templates.length,
      flat: buildFlatContactRows(tables.targets, tables.contacts).length
    }
  };
}
