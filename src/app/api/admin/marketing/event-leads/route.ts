import { NextResponse } from "next/server";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import {
  EVENT_LEAD_FORM_TYPES,
  EVENT_LEAD_STATUSES,
  LONG_BEACH_EXPO_2026,
  SARAH_ROSE_LONG_BEACH_EXTRACT,
  TERRY_FACILITATOR_REF_CODE,
  eventLeadSubmitSchema,
  type EventLeadFormTypeId
} from "@/lib/event-leads";
import {
  createEventLead,
  findEventLeadByEmailAndEvent,
  getEventLead,
  listEventLeads,
  updateEventLead,
  updateEventLeadStatus
} from "@/lib/event-leads-db";
import {
  looksLikeAweberSubscriberExport,
  normalizeImportRow,
  parseDelimitedTable
} from "@/lib/marketing-import";

function coerceFormType(raw: string | null | undefined): "practice_survey" | "consumer_lead" {
  const v = (raw || "").trim().toLowerCase();
  if (v === "consumer_lead" || v === "consumer" || v === "abundance") return "consumer_lead";
  return "practice_survey";
}

function rowToLeadInput(row: Record<string, string>) {
  const n = normalizeImportRow(row);
  return {
    formType: coerceFormType(n.formType),
    eventName: n.eventName || LONG_BEACH_EXPO_2026.eventName,
    eventDates: n.eventDates || LONG_BEACH_EXPO_2026.eventDates,
    eventKey: n.eventKey || LONG_BEACH_EXPO_2026.eventKey,
    fullName: n.fullName,
    firstName: n.firstName,
    lastName: n.lastName,
    email: n.email,
    phoneMobile: n.phoneMobile,
    city: n.city,
    state: n.state,
    zip: n.zip,
    persona: n.persona,
    category: n.category,
    interest: n.interest,
    entryPath: n.entryPath,
    refCode: n.refCode || TERRY_FACILITATOR_REF_CODE,
    notes: n.notes,
    autoReply: false
  };
}

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const extractsKey = url.searchParams.get("extracts");
  if (extractsKey === "long-beach-2026-08") {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(
      process.cwd(),
      "docs",
      "lead-card-scans",
      "long-beach-2026-08",
      "extracts.json"
    );
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(raw) as unknown;
      return NextResponse.json(data, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" }
      });
    } catch {
      return NextResponse.json(
        {
          error:
            "Extracts file not found on server (docs/lead-card-scans/long-beach-2026-08/extracts.json)."
        },
        { status: 404 }
      );
    }
  }
  const id = url.searchParams.get("id");
  if (id) {
    const lead = await getEventLead(id);
    if (!lead) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ lead, formTypes: EVENT_LEAD_FORM_TYPES });
  }
  const eventKey = url.searchParams.get("eventKey");
  const formType = url.searchParams.get("formType") as EventLeadFormTypeId | null;
  const leads = await listEventLeads({
    eventKey,
    formType: formType || null
  });
  const res = NextResponse.json({ leads, formTypes: EVENT_LEAD_FORM_TYPES });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const adminEmail = await getSessionEmail();

  if (body?.seedSarahRose === true) {
    const existing = await findEventLeadByEmailAndEvent(
      SARAH_ROSE_LONG_BEACH_EXTRACT.email!,
      SARAH_ROSE_LONG_BEACH_EXTRACT.eventKey ?? null
    );
    if (existing) {
      return NextResponse.json({ lead: existing, alreadyExisted: true });
    }
    const lead = await createEventLead(SARAH_ROSE_LONG_BEACH_EXTRACT, {
      createdByEmail: adminEmail
    });
    return NextResponse.json({ lead, alreadyExisted: false });
  }

  if (body?.importExtracts === true && Array.isArray(body.leads)) {
    const batch = body.leads as unknown[];
    if (batch.length > 250) {
      return NextResponse.json(
        { error: "Import batch too large (max 250)." },
        { status: 400 }
      );
    }
    const results: { scanId?: string; id?: string; skipped?: boolean; error?: string }[] = [];
    for (const raw of batch) {
      const row = raw as Record<string, unknown>;
      const scanId = typeof row?.scanId === "string" ? row.scanId : undefined;
      const parsed = eventLeadSubmitSchema.safeParse({
        formType: row.formType,
        eventName: row.eventName || LONG_BEACH_EXPO_2026.eventName,
        eventDates: row.eventDates || LONG_BEACH_EXPO_2026.eventDates,
        eventKey: row.eventKey || LONG_BEACH_EXPO_2026.eventKey,
        fullName: row.fullName,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phoneMobile: row.phoneMobile,
        smsOk: row.smsOk,
        city: row.city,
        state: row.state,
        zip: row.zip,
        persona: row.persona,
        category: row.category,
        interest: row.interest,
        entryPath: row.entryPath,
        refCode: row.refCode || TERRY_FACILITATOR_REF_CODE,
        notes: row.notes,
        sourceScanPath: row.sourceScanPath,
        autoReply: false,
        practice: row.practice,
        consumer: row.consumer
      });
      if (!parsed.success) {
        results.push({ scanId, error: "invalid" });
        continue;
      }
      const email = parsed.data.email;
      if (email) {
        const existing = await findEventLeadByEmailAndEvent(
          email,
          parsed.data.eventKey ?? null
        );
        if (existing) {
          results.push({ scanId, id: existing.id, skipped: true });
          continue;
        }
      }
      const lead = await createEventLead(parsed.data, { createdByEmail: adminEmail });
      if (row.statusHint === "paused") {
        await updateEventLeadStatus(lead.id, "paused");
      }
      results.push({ scanId, id: lead.id, skipped: false });
    }
    return NextResponse.json({
      imported: results.filter((r) => r.id && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      errors: results.filter((r) => r.error).length,
      results
    });
  }

  if (body?.importDatabase === true) {
    let batch: Record<string, string>[] = [];
    if (typeof body.text === "string" && body.text.trim()) {
      batch = parseDelimitedTable(body.text);
    } else if (Array.isArray(body.rows)) {
      batch = (body.rows as unknown[]).map((raw) => {
        if (!raw || typeof raw !== "object") return {};
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
          if (v == null) continue;
          out[k] = typeof v === "string" ? v : String(v);
        }
        return out;
      });
    } else if (Array.isArray(body.leads)) {
      batch = (body.leads as unknown[]).map((raw) => {
        if (!raw || typeof raw !== "object") return {};
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
          if (v == null || typeof v === "object") continue;
          out[k] = typeof v === "string" ? v : String(v);
        }
        return out;
      });
    }
    if (batch.length > 500) {
      return NextResponse.json(
        { error: "Import batch too large (max 500)." },
        { status: 400 }
      );
    }
    if (!batch.length) {
      return NextResponse.json(
        { error: "No rows to import. Upload CSV/TSV or JSON with name/email columns." },
        { status: 400 }
      );
    }
    if (looksLikeAweberSubscriberExport(batch)) {
      return NextResponse.json(
        {
          error:
            "This looks like an AWeber subscriber export. Use Import outreach database in Leads & outreach instead. Event-lead import would tag everyone as a Long Beach Expo card."
        },
        { status: 400 }
      );
    }
    const results: { id?: string; skipped?: boolean; error?: string }[] = [];
    for (const row of batch) {
      const parsed = eventLeadSubmitSchema.safeParse(rowToLeadInput(row));
      if (!parsed.success) {
        results.push({ error: "invalid" });
        continue;
      }
      const email = parsed.data.email;
      if (email) {
        const existing = await findEventLeadByEmailAndEvent(
          email,
          parsed.data.eventKey ?? null
        );
        if (existing) {
          results.push({ id: existing.id, skipped: true });
          continue;
        }
      }
      const lead = await createEventLead(parsed.data, { createdByEmail: adminEmail });
      if (row.status === "paused") {
        await updateEventLeadStatus(lead.id, "paused");
      }
      results.push({ id: lead.id, skipped: false });
    }
    return NextResponse.json({
      imported: results.filter((r) => r.id && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      errors: results.filter((r) => r.error).length,
      results
    });
  }

  const parsed = eventLeadSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid lead data.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const lead = await createEventLead(parsed.data, { createdByEmail: adminEmail });
  return NextResponse.json({ lead });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "id required." }, { status: 400 });
  }

  // Status-only shortcut (list dropdown).
  if (body?.status && !body?.formType && !body?.eventName && !body?.fullName) {
    const status = String(body.status).trim();
    const allowed = new Set<string>(EVENT_LEAD_STATUSES.map((s) => s.id));
    if (!allowed.has(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    const lead = await updateEventLeadStatus(id, status);
    if (!lead) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ lead });
  }

  const parsed = eventLeadSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid lead data.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  let nextStatus: string | undefined;
  if (typeof body.status === "string") {
    const status = body.status.trim();
    const allowed = new Set<string>(EVENT_LEAD_STATUSES.map((s) => s.id));
    if (!allowed.has(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    nextStatus = status;
  }
  const lead = await updateEventLead(id, {
    ...parsed.data,
    status: nextStatus
  });
  if (!lead) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ lead });
}
