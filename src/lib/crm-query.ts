/**
 * Contact-centric CRM query: filter people by target + contact fields
 * and suggest a conversion email when we have enough process info.
 */
import type { FlatCrmRow } from "@/lib/crm-export";
import {
  extractLeadGoalInterests,
  planInterestSequence
} from "@/lib/lead-interest-sequence";

export const DEFAULT_CAMPAIGN_TEMPLATE =
  "Convert nurture 1 - Imagine the best you";

export type CrmContactQuery = {
  q?: string | null;
  status?: string | null;
  persona?: string | null;
  category?: string | null;
  interest?: string | null;
  entryPath?: string | null;
  targetType?: string | null;
  doNotEmail?: boolean | null;
  hasEmail?: boolean | null;
  tag?: string | null;
};

export type SuggestedProcess = {
  canAutoSetup: boolean;
  templateName: string | null;
  interest: string | null;
  reason: "interest" | "process_fields" | "do_not_email" | "no_email" | "need_template";
};

function haystack(row: FlatCrmRow): string {
  return [
    row.organization,
    row.targetContact,
    row.notes,
    row.persona,
    row.category,
    row.refCode,
    row.interest,
    row.entryPath,
    row.status,
    row.contactName,
    row.firstName,
    row.lastName,
    row.email,
    row.phone,
    row.phoneMobile,
    row.contactNotes,
    row.roleTitle
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function notesBlob(row: FlatCrmRow): string {
  return `${row.notes || ""}\n${row.contactNotes || ""}`;
}

export function tagsFromNotes(notes: string | null | undefined): string[] {
  if (!notes) return [];
  const match = notes.match(/Tags:\s*([^\n]+)/i);
  if (!match) return [];
  return match[1]
    .split(/[,;|/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function filterCrmContactRows(
  rows: FlatCrmRow[],
  query: CrmContactQuery,
  nowMs = Date.now()
): FlatCrmRow[] {
  const q = (query.q || "").trim().toLowerCase();
  const status = (query.status || "all").trim() || "all";
  const persona = (query.persona || "").trim().toLowerCase();
  const category = (query.category || "").trim().toLowerCase();
  const interest = (query.interest || "").trim().toLowerCase();
  const entryPath = (query.entryPath || "").trim().toLowerCase();
  const targetType = (query.targetType || "").trim().toLowerCase();
  const tag = (query.tag || "").trim().toLowerCase();

  return rows.filter((row) => {
    if (status === "due") {
      if (!row.followUpAt) return false;
      const ms = Date.parse(row.followUpAt);
      if (Number.isNaN(ms) || ms > nowMs + 7 * 86400000) return false;
    } else if (status !== "all" && row.status !== status) {
      return false;
    }
    if (query.doNotEmail === true && !row.doNotEmail) return false;
    if (query.doNotEmail === false && row.doNotEmail) return false;
    if (query.hasEmail === true && !row.email?.trim()) return false;
    if (query.hasEmail === false && row.email?.trim()) return false;
    if (persona && (row.persona || "").toLowerCase() !== persona) return false;
    if (category && (row.category || "").toLowerCase() !== category) return false;
    if (interest && !(row.interest || "").toLowerCase().includes(interest)) return false;
    if (entryPath && (row.entryPath || "").toLowerCase() !== entryPath) return false;
    if (targetType && (row.targetType || "").toLowerCase() !== targetType) return false;
    if (tag) {
      const tags = tagsFromNotes(notesBlob(row)).map((t) => t.toLowerCase());
      const inNotes = notesBlob(row).toLowerCase().includes(tag);
      if (!tags.includes(tag) && !inNotes) return false;
    }
    if (q && !haystack(row).includes(q)) return false;
    return true;
  });
}

export function suggestedProcessForRow(row: FlatCrmRow): SuggestedProcess {
  if (row.doNotEmail) {
    return {
      canAutoSetup: false,
      templateName: null,
      interest: row.interest,
      reason: "do_not_email"
    };
  }
  if (!row.email?.trim()) {
    return {
      canAutoSetup: false,
      templateName: null,
      interest: row.interest,
      reason: "no_email"
    };
  }

  const extra = tagsFromNotes(notesBlob(row));
  const interests = extractLeadGoalInterests(null, [row.interest, ...extra].filter(Boolean).join(", "));
  const plan = planInterestSequence(interests);
  if (plan[0]) {
    return {
      canAutoSetup: true,
      templateName: plan[0].templateName,
      interest: plan[0].interest,
      reason: "interest"
    };
  }
  if (row.persona || row.category || row.entryPath || row.interest) {
    return {
      canAutoSetup: true,
      templateName: DEFAULT_CAMPAIGN_TEMPLATE,
      interest: row.interest,
      reason: "process_fields"
    };
  }
  return {
    canAutoSetup: false,
    templateName: null,
    interest: row.interest,
    reason: "need_template"
  };
}

export function groupRowsBySuggestedTemplate(rows: FlatCrmRow[]): {
  templateName: string;
  rows: FlatCrmRow[];
}[] {
  const map = new Map<string, FlatCrmRow[]>();
  for (const row of rows) {
    const suggested = suggestedProcessForRow(row);
    if (!suggested.canAutoSetup || !suggested.templateName) continue;
    const list = map.get(suggested.templateName) ?? [];
    list.push(row);
    map.set(suggested.templateName, list);
  }
  return [...map.entries()].map(([templateName, grouped]) => ({
    templateName,
    rows: grouped
  }));
}
