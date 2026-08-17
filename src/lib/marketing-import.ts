/**
 * Shared CSV / spreadsheet-row helpers for Marketing lead + outreach imports.
 */

export function parseDelimitedTable(text: string): Record<string, string>[] {
  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) return [];

  // JSON array of objects
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
        .map((row) => {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) {
            if (v == null) continue;
            out[String(k)] = typeof v === "string" ? v : String(v);
          }
          return out;
        });
    } catch {
      return [];
    }
  }

  // JSON object with leads/rows/targets array
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const list =
        (Array.isArray(parsed.leads) && parsed.leads) ||
        (Array.isArray(parsed.rows) && parsed.rows) ||
        (Array.isArray(parsed.targets) && parsed.targets) ||
        (Array.isArray(parsed.contacts) && parsed.contacts) ||
        null;
      if (!list) return [];
      return parseDelimitedTable(JSON.stringify(list));
    } catch {
      return [];
    }
  }

  const lines = splitCsvLines(raw);
  if (lines.length < 2) return [];
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvRow(lines[0], delimiter).map((h) => h.trim());
  if (!headers.length) return [];

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvRow(lines[i], delimiter);
    if (cells.every((c) => !c.trim())) continue;
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (!header) return;
      row[header] = (cells[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function detectDelimiter(headerLine: string): string {
  const commas = (headerLine.match(/,/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  if (tabs > commas && tabs >= semis) return "\t";
  if (semis > commas) return ";";
  return ",";
}

function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      if (current.trim()) lines.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) lines.push(current);
  return lines;
}

function splitCsvRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

function normKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./]+/g, "");
}

/** Read first matching column (case/spacing insensitive). */
export function pickField(
  row: Record<string, string>,
  ...aliases: string[]
): string | null {
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(row)) {
    map.set(normKey(k), v);
  }
  for (const alias of aliases) {
    const hit = map.get(normKey(alias));
    if (hit != null && String(hit).trim()) return String(hit).trim();
  }
  return null;
}

export type NormalizedImportPerson = {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneMobile: string | null;
  organization: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  persona: string | null;
  category: string | null;
  interest: string | null;
  entryPath: string | null;
  refCode: string | null;
  formType: string | null;
  eventName: string | null;
  eventDates: string | null;
  eventKey: string | null;
  targetType: string | null;
  status: string | null;
};

export function normalizeImportRow(row: Record<string, string>): NormalizedImportPerson {
  const firstName = pickField(row, "firstName", "first_name", "firstname", "first");
  const lastName = pickField(row, "lastName", "last_name", "lastname", "last");
  const fullName =
    pickField(row, "fullName", "full_name", "name", "contact", "contactName", "person") ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    null;
  return {
    fullName,
    firstName,
    lastName,
    email: pickField(row, "email", "e-mail", "emailAddress", "email_address"),
    phoneMobile: pickField(
      row,
      "phoneMobile",
      "phone_mobile",
      "mobile",
      "phone",
      "cell",
      "telephone"
    ),
    organization: pickField(
      row,
      "organization",
      "org",
      "company",
      "business",
      "businessName",
      "practice"
    ),
    city: pickField(row, "city"),
    state: pickField(row, "state", "province", "region"),
    zip: pickField(row, "zip", "zipcode", "postal", "postalCode"),
    notes: pickField(row, "notes", "note", "comments", "comment"),
    persona: pickField(row, "persona"),
    category: pickField(row, "category"),
    interest: pickField(row, "interest"),
    entryPath: pickField(row, "entryPath", "entry_path", "path"),
    refCode: pickField(row, "refCode", "ref_code", "ref", "affiliateCode", "referralCode"),
    formType: pickField(row, "formType", "form_type", "type"),
    eventName: pickField(row, "eventName", "event_name", "event"),
    eventDates: pickField(row, "eventDates", "event_dates", "dates"),
    eventKey: pickField(row, "eventKey", "event_key"),
    targetType: pickField(row, "targetType", "target_type"),
    status: pickField(row, "status")
  };
}
