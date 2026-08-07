import { NextResponse } from "next/server";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import {
  EVENT_LEAD_FORM_TYPES,
  SARAH_ROSE_LONG_BEACH_EXTRACT,
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

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
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
    const results: { scanId?: string; id?: string; skipped?: boolean; error?: string }[] = [];
    for (const raw of body.leads) {
      const scanId = typeof raw?.scanId === "string" ? raw.scanId : undefined;
      const parsed = eventLeadSubmitSchema.safeParse({
        formType: raw.formType,
        eventName: raw.eventName || "Holistic Healing Expo - Long Beach",
        eventDates: raw.eventDates || "2026-08-01 / 2026-08-02",
        eventKey: raw.eventKey || "holistic-healing-expo-long-beach-2026-08",
        fullName: raw.fullName,
        firstName: raw.firstName,
        lastName: raw.lastName,
        email: raw.email,
        phoneMobile: raw.phoneMobile,
        smsOk: raw.smsOk,
        city: raw.city,
        state: raw.state,
        zip: raw.zip,
        persona: raw.persona,
        category: raw.category,
        interest: raw.interest,
        entryPath: raw.entryPath,
        notes: raw.notes,
        sourceScanPath: raw.sourceScanPath,
        autoReply: false,
        practice: raw.practice,
        consumer: raw.consumer
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
      if (raw.statusHint === "paused") {
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
    if (!status) {
      return NextResponse.json({ error: "status required." }, { status: 400 });
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
  const lead = await updateEventLead(id, {
    ...parsed.data,
    status: typeof body.status === "string" ? body.status : undefined
  });
  if (!lead) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ lead });
}
