/**
 * Map AWeber list-folder exports (active_leads.csv / inactive_leads.csv)
 * into CRM tags, interests, and campaign templates.
 */
import { DEFAULT_CAMPAIGN_TEMPLATE } from "@/lib/crm-query";
import { leadCardInterestTemplateName } from "@/lib/lead-card-interest-emails";
import {
  buildOutreachImportNotes,
  importMarksDoNotEmail,
  normalizeImportRow,
  parseDelimitedTable,
  type NormalizedImportPerson
} from "@/lib/marketing-import";

export const AWEBER_LIST_TAG_PREFIX = "aweber-";
export const PARTNER_CAMPAIGN_TEMPLATE = "Partner / affiliate intro";

export type AweberListKind = "consumer" | "partner" | "member" | "newsletter";

export type AweberListMeta = {
  folder: string;
  listId: string;
  title: string;
  tag: string;
  interest: string;
  templateName: string;
  category: string;
  entryPath: string;
  kind: AweberListKind;
};

const CONSUMER_CATEGORY = "Individuals & influencers";
const PARTNER_CATEGORY = "Coaches, studios & practitioners";

export function parseAweberListFolderName(folder: string): { listId: string; title: string } {
  const match = folder.match(/^awlist(\d+)_(.+)$/i);
  if (!match) return { listId: folder, title: folder };
  return { listId: match[1], title: match[2].trim() };
}

export function aweberListTag(listId: string): string {
  return `${AWEBER_LIST_TAG_PREFIX}${listId}`;
}

function leadCard(label: string): { interest: string; templateName: string } {
  return { interest: label, templateName: leadCardInterestTemplateName(label) };
}

export function metaFromAweberFolder(folder: string): AweberListMeta {
  const { listId, title } = parseAweberListFolderName(folder);
  const t = title.toLowerCase();
  const base = {
    folder,
    listId,
    title,
    tag: aweberListTag(listId)
  };

  const consumer = (
    interest: string,
    templateName: string
  ): AweberListMeta => ({
    ...base,
    interest,
    templateName,
    category: CONSUMER_CATEGORY,
    entryPath: "Direct",
    kind: "consumer"
  });

  const partner = (): AweberListMeta => ({
    ...base,
    interest: "Affiliate partnership",
    templateName: PARTNER_CAMPAIGN_TEMPLATE,
    category: PARTNER_CATEGORY,
    entryPath: "Affiliate",
    kind: "partner"
  });

  const newsletter = (): AweberListMeta => ({
    ...base,
    interest: "Personal membership",
    templateName: DEFAULT_CAMPAIGN_TEMPLATE,
    category: CONSUMER_CATEGORY,
    entryPath: "Direct",
    kind: "newsletter"
  });

  const member = (): AweberListMeta => ({
    ...base,
    interest: "Personal membership",
    templateName: DEFAULT_CAMPAIGN_TEMPLATE,
    category: CONSUMER_CATEGORY,
    entryPath: "Direct",
    kind: "member"
  });

  if (/weight\s*control/.test(t)) {
    const card = leadCard("Weight Control");
    return consumer(card.interest, card.templateName);
  }
  if (/spiritual/.test(t)) {
    const card = leadCard("Spiritual Growth");
    return consumer(card.interest, card.templateName);
  }
  if (/\bstress\b/.test(t)) {
    const card = leadCard("Stress Management");
    return consumer(card.interest, card.templateName);
  }
  if (/\bmemory\b/.test(t)) {
    const card = leadCard("Memory Excellence");
    return consumer(card.interest, card.templateName);
  }
  if (/procrastination/.test(t)) {
    const card = leadCard("End Procrastination");
    return consumer(card.interest, card.templateName);
  }
  if (/attract\s*love/.test(t)) {
    const card = leadCard("Attract Love");
    return consumer(card.interest, card.templateName);
  }
  if (/raise\s*income/.test(t)) {
    const card = leadCard("Raise Income");
    return consumer(card.interest, card.templateName);
  }
  if (/sales/.test(t)) {
    const card = leadCard("Sales Skills");
    return consumer(card.interest, card.templateName);
  }
  if (/health|rejuven/.test(t)) {
    const card = leadCard("Health & Rejuvenation");
    return consumer(card.interest, card.templateName);
  }
  if (/5-minute|meditation/.test(t)) {
    const card = leadCard("Sleep Well");
    return consumer(card.interest, card.templateName);
  }
  if (/soulsearch/.test(t)) {
    const card = leadCard("Spiritual Growth");
    return consumer(card.interest, card.templateName);
  }
  if (
    /clients\s*grow|sbe|small business|expo|university|success center/.test(t)
  ) {
    return partner();
  }
  if (/\brfts\b/.test(t)) return member();
  return newsletter();
}

export function titleCasePersonName(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  return raw
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function extraGoalTags(n: NormalizedImportPerson): string[] {
  const out: string[] = [...(n.goals || [])];
  if (!n.notes) return out;
  const parts = n.notes
    .split(/[,;/|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 40);
  if (parts.length >= 2) out.push(...parts);
  return [...new Set(out)];
}

export function buildAweberContactNotes(input: {
  person: NormalizedImportPerson;
  listTags: string[];
  listTitles: string[];
  unsubscribedLists: string[];
}): string {
  const bits: string[] = [];
  const importNotes = buildOutreachImportNotes({
    ...input.person,
    goals: extraGoalTags(input.person)
  });
  if (importNotes) bits.push(importNotes);
  if (input.listTitles.length) bits.push(`AWeber lists: ${input.listTitles.join(", ")}`);
  const tags = [...input.listTags];
  if (input.unsubscribedLists.length) {
    bits.push(`AWeber unsubscribed: ${input.unsubscribedLists.join(", ")}`);
  }
  if (tags.length) bits.push(`Tags: ${[...new Set(tags)].join(", ")}`);
  return bits.join(" | ");
}

export type ParsedAweberLead = {
  email: string;
  person: NormalizedImportPerson;
  active: boolean;
};

export function parseAweberLeadsCsv(text: string): ParsedAweberLead[] {
  const rows = parseDelimitedTable(text);
  const out: ParsedAweberLead[] = [];
  for (const row of rows) {
    const person = normalizeImportRow(row);
    const email = person.email?.trim().toLowerCase() || "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    const titled = titleCasePersonName(person.fullName);
    if (titled) {
      const parts = titled.split(/\s+/);
      person.fullName = titled;
      person.firstName = person.firstName ? titleCasePersonName(person.firstName) : parts[0];
      person.lastName =
        person.lastName
          ? titleCasePersonName(person.lastName)
          : parts.length > 1
            ? parts.slice(1).join(" ")
            : person.lastName;
    }
    out.push({
      email,
      person,
      active: !importMarksDoNotEmail(person.status)
    });
  }
  return out;
}

export type MergedAweberContact = {
  email: string;
  person: NormalizedImportPerson;
  activeListTags: string[];
  allListTitles: string[];
  unsubscribedTitles: string[];
  doNotEmail: boolean;
  primaryMeta: AweberListMeta;
};

export function mergeAweberLeads(
  lists: Array<{ meta: AweberListMeta; leads: ParsedAweberLead[] }>
): MergedAweberContact[] {
  const byEmail = new Map<
    string,
    {
      person: NormalizedImportPerson;
      activeTags: Set<string>;
      titles: Set<string>;
      unsub: Set<string>;
      metas: AweberListMeta[];
    }
  >();

  for (const { meta, leads } of lists) {
    for (const lead of leads) {
      const cur = byEmail.get(lead.email);
      if (!cur) {
        byEmail.set(lead.email, {
          person: lead.person,
          activeTags: new Set(lead.active ? [meta.tag] : []),
          titles: new Set([meta.title]),
          unsub: new Set(lead.active ? [] : [meta.title]),
          metas: [meta]
        });
        continue;
      }
      if (!cur.person.fullName && lead.person.fullName) cur.person = lead.person;
      cur.titles.add(meta.title);
      cur.metas.push(meta);
      if (lead.active) cur.activeTags.add(meta.tag);
      else {
        cur.unsub.add(meta.title);
        cur.activeTags.delete(meta.tag);
      }
    }
  }

  const kindRank: Record<AweberListKind, number> = {
    consumer: 0,
    partner: 1,
    newsletter: 2,
    member: 3
  };

  return [...byEmail.entries()].map(([email, cur]) => {
    const uniqueMetas = [...new Map(cur.metas.map((m) => [m.listId, m])).values()].sort(
      (a, b) => kindRank[a.kind] - kindRank[b.kind]
    );
    return {
      email,
      person: cur.person,
      activeListTags: [...cur.activeTags],
      allListTitles: [...cur.titles],
      unsubscribedTitles: [...cur.unsub],
      doNotEmail: cur.activeTags.size === 0,
      primaryMeta: uniqueMetas[0]
    };
  });
}

export function campaignNameForList(meta: AweberListMeta, part: number, parts: number): string {
  const stamp = new Date().toISOString().slice(0, 10);
  if (parts <= 1) return `AWeber · ${meta.title} · ${stamp}`;
  return `AWeber · ${meta.title} (${part}/${parts}) · ${stamp}`;
}

export function chunkIds<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
