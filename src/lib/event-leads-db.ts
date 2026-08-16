import { sql } from "@vercel/postgres";
import {
  applyLeadDefaults,
  type EventLeadFormTypeId,
  type EventLeadRecord,
  type EventLeadSubmitInput
} from "@/lib/event-leads";
import {
  createOutreachActivity,
  createOutreachContact,
  createOutreachTarget,
  listOutreachContacts,
  updateOutreachContact,
  updateOutreachTarget
} from "@/lib/db";

let eventLeadsTableReady = false;

const ensureEventLeadsTable = async () => {
  if (eventLeadsTableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS marketing_event_leads (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      form_type text NOT NULL,
      status text NOT NULL DEFAULT 'new',
      event_name text NOT NULL,
      event_dates text,
      event_key text,
      first_name text,
      last_name text,
      full_name text,
      email text,
      phone_mobile text,
      sms_ok boolean NOT NULL DEFAULT false,
      city text,
      state text,
      zip text,
      country text,
      persona text,
      category text,
      interest text,
      entry_path text,
      captured_by text,
      notes text,
      source_scan_path text,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      outreach_target_id uuid,
      auto_reply_sent_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS marketing_event_leads_event_key_idx
    ON marketing_event_leads (event_key)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS marketing_event_leads_email_idx
    ON marketing_event_leads (lower(email))
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS marketing_event_leads_email_event_uidx
    ON marketing_event_leads (lower(email), event_key)
    WHERE email IS NOT NULL AND event_key IS NOT NULL
  `;
  eventLeadsTableReady = true;
};

function mapLeadRow(row: EventLeadRecord): EventLeadRecord {
  const payload =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? row.payload
      : {};
  return { ...row, payload };
}

export async function listEventLeads(options?: {
  eventKey?: string | null;
  formType?: EventLeadFormTypeId | null;
  limit?: number;
}): Promise<EventLeadRecord[]> {
  await ensureEventLeadsTable();
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 300);
  const eventKey = options?.eventKey?.trim() || null;
  const formType = options?.formType || null;

  if (eventKey && formType) {
    const { rows } = await sql<EventLeadRecord>`
      SELECT
        id, form_type AS "formType", status,
        event_name AS "eventName", event_dates AS "eventDates", event_key AS "eventKey",
        first_name AS "firstName", last_name AS "lastName", full_name AS "fullName",
        email, phone_mobile AS "phoneMobile", COALESCE(sms_ok, false) AS "smsOk",
        city, state, zip, country,
        persona, category, interest, entry_path AS "entryPath",
        captured_by AS "capturedBy", notes, source_scan_path AS "sourceScanPath",
        COALESCE(payload, '{}'::jsonb) AS payload,
        outreach_target_id AS "outreachTargetId",
        auto_reply_sent_at AS "autoReplySentAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM marketing_event_leads
      WHERE event_key = ${eventKey} AND form_type = ${formType}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.map(mapLeadRow);
  }
  if (eventKey) {
    const { rows } = await sql<EventLeadRecord>`
      SELECT
        id, form_type AS "formType", status,
        event_name AS "eventName", event_dates AS "eventDates", event_key AS "eventKey",
        first_name AS "firstName", last_name AS "lastName", full_name AS "fullName",
        email, phone_mobile AS "phoneMobile", COALESCE(sms_ok, false) AS "smsOk",
        city, state, zip, country,
        persona, category, interest, entry_path AS "entryPath",
        captured_by AS "capturedBy", notes, source_scan_path AS "sourceScanPath",
        COALESCE(payload, '{}'::jsonb) AS payload,
        outreach_target_id AS "outreachTargetId",
        auto_reply_sent_at AS "autoReplySentAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM marketing_event_leads
      WHERE event_key = ${eventKey}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.map(mapLeadRow);
  }
  if (formType) {
    const { rows } = await sql<EventLeadRecord>`
      SELECT
        id, form_type AS "formType", status,
        event_name AS "eventName", event_dates AS "eventDates", event_key AS "eventKey",
        first_name AS "firstName", last_name AS "lastName", full_name AS "fullName",
        email, phone_mobile AS "phoneMobile", COALESCE(sms_ok, false) AS "smsOk",
        city, state, zip, country,
        persona, category, interest, entry_path AS "entryPath",
        captured_by AS "capturedBy", notes, source_scan_path AS "sourceScanPath",
        COALESCE(payload, '{}'::jsonb) AS payload,
        outreach_target_id AS "outreachTargetId",
        auto_reply_sent_at AS "autoReplySentAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM marketing_event_leads
      WHERE form_type = ${formType}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.map(mapLeadRow);
  }
  const { rows } = await sql<EventLeadRecord>`
    SELECT
      id, form_type AS "formType", status,
      event_name AS "eventName", event_dates AS "eventDates", event_key AS "eventKey",
      first_name AS "firstName", last_name AS "lastName", full_name AS "fullName",
      email, phone_mobile AS "phoneMobile", COALESCE(sms_ok, false) AS "smsOk",
      city, state, zip, country,
      persona, category, interest, entry_path AS "entryPath",
      captured_by AS "capturedBy", notes, source_scan_path AS "sourceScanPath",
      COALESCE(payload, '{}'::jsonb) AS payload,
      outreach_target_id AS "outreachTargetId",
      auto_reply_sent_at AS "autoReplySentAt",
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM marketing_event_leads
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(mapLeadRow);
}

export async function getEventLead(id: string): Promise<EventLeadRecord | null> {
  await ensureEventLeadsTable();
  const { rows } = await sql<EventLeadRecord>`
    SELECT
      id, form_type AS "formType", status,
      event_name AS "eventName", event_dates AS "eventDates", event_key AS "eventKey",
      first_name AS "firstName", last_name AS "lastName", full_name AS "fullName",
      email, phone_mobile AS "phoneMobile", COALESCE(sms_ok, false) AS "smsOk",
      city, state, zip, country,
      persona, category, interest, entry_path AS "entryPath",
      captured_by AS "capturedBy", notes, source_scan_path AS "sourceScanPath",
      COALESCE(payload, '{}'::jsonb) AS payload,
      outreach_target_id AS "outreachTargetId",
      auto_reply_sent_at AS "autoReplySentAt",
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM marketing_event_leads
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ? mapLeadRow(rows[0]) : null;
}

export async function findEventLeadByEmailAndEvent(
  email: string,
  eventKey: string | null
): Promise<EventLeadRecord | null> {
  await ensureEventLeadsTable();
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  if (eventKey) {
    const { rows } = await sql<EventLeadRecord>`
      SELECT
        id, form_type AS "formType", status,
        event_name AS "eventName", event_dates AS "eventDates", event_key AS "eventKey",
        first_name AS "firstName", last_name AS "lastName", full_name AS "fullName",
        email, phone_mobile AS "phoneMobile", COALESCE(sms_ok, false) AS "smsOk",
        city, state, zip, country,
        persona, category, interest, entry_path AS "entryPath",
        captured_by AS "capturedBy", notes, source_scan_path AS "sourceScanPath",
        COALESCE(payload, '{}'::jsonb) AS payload,
        outreach_target_id AS "outreachTargetId",
        auto_reply_sent_at AS "autoReplySentAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM marketing_event_leads
      WHERE lower(email) = ${normalized} AND event_key = ${eventKey}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return rows[0] ? mapLeadRow(rows[0]) : null;
  }
  const { rows } = await sql<EventLeadRecord>`
    SELECT
      id, form_type AS "formType", status,
      event_name AS "eventName", event_dates AS "eventDates", event_key AS "eventKey",
      first_name AS "firstName", last_name AS "lastName", full_name AS "fullName",
      email, phone_mobile AS "phoneMobile", COALESCE(sms_ok, false) AS "smsOk",
      city, state, zip, country,
      persona, category, interest, entry_path AS "entryPath",
      captured_by AS "capturedBy", notes, source_scan_path AS "sourceScanPath",
      COALESCE(payload, '{}'::jsonb) AS payload,
      outreach_target_id AS "outreachTargetId",
      auto_reply_sent_at AS "autoReplySentAt",
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM marketing_event_leads
    WHERE lower(email) = ${normalized}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] ? mapLeadRow(rows[0]) : null;
}

export async function createEventLead(
  raw: EventLeadSubmitInput,
  options?: { linkOutreach?: boolean; createdByEmail?: string | null }
): Promise<EventLeadRecord> {
  await ensureEventLeadsTable();
  const input = applyLeadDefaults(raw);
  const payload = {
    practice: input.practice ?? null,
    consumer: input.consumer ?? null
  };
  const payloadJson = JSON.stringify(payload);

  let outreachTargetId: string | null = null;
  if (options?.linkOutreach !== false) {
    const orgName =
      input.fullName ||
      [input.firstName, input.lastName].filter(Boolean).join(" ") ||
      input.email ||
      "Event lead";
    const target = await createOutreachTarget({
      organization: orgName,
      targetType: "individual",
      category: input.category,
      persona: input.persona,
      entryPath: input.entryPath,
      contact: [input.email, input.phoneMobile].filter(Boolean).join(" · ") || null,
      status: "prospect",
      notes: [
        `Event lead (${input.formType})`,
        input.eventName,
        input.eventDates,
        input.notes
      ]
        .filter(Boolean)
        .join(" | "),
      interest: input.interest,
      followUpAt: null,
      doNotEmail: false
    });
    outreachTargetId = target.id;
    await createOutreachContact({
      targetId: target.id,
      firstName: input.firstName,
      lastName: input.lastName,
      name: input.fullName,
      email: input.email,
      phoneMobile: input.phoneMobile,
      roleTitle: input.practice?.primaryOccupation || input.consumer?.position || null,
      notes: input.notes,
      isPrimary: true
    });
    await createOutreachActivity({
      targetId: target.id,
      kind: "event_lead_created",
      subject: input.eventName,
      bodyPreview: `${input.formType} lead captured`,
      meta: { formType: input.formType, eventKey: input.eventKey },
      createdByEmail: options?.createdByEmail ?? null
    });
  }

  const { rows } = await sql<EventLeadRecord>`
    INSERT INTO marketing_event_leads (
      form_type, status, event_name, event_dates, event_key,
      first_name, last_name, full_name, email, phone_mobile, sms_ok,
      city, state, zip, country,
      persona, category, interest, entry_path,
      captured_by, notes, source_scan_path, payload, outreach_target_id
    ) VALUES (
      ${input.formType},
      'new',
      ${input.eventName},
      ${input.eventDates ?? null},
      ${input.eventKey ?? null},
      ${input.firstName ?? null},
      ${input.lastName ?? null},
      ${input.fullName ?? null},
      ${input.email ?? null},
      ${input.phoneMobile ?? null},
      ${Boolean(input.smsOk)},
      ${input.city ?? null},
      ${input.state ?? null},
      ${input.zip ?? null},
      ${input.country ?? null},
      ${input.persona ?? null},
      ${input.category ?? null},
      ${input.interest ?? null},
      ${input.entryPath ?? null},
      ${input.capturedBy ?? null},
      ${input.notes ?? null},
      ${input.sourceScanPath ?? null},
      CAST(${payloadJson} AS jsonb),
      ${outreachTargetId}
    )
    RETURNING
      id, form_type AS "formType", status,
      event_name AS "eventName", event_dates AS "eventDates", event_key AS "eventKey",
      first_name AS "firstName", last_name AS "lastName", full_name AS "fullName",
      email, phone_mobile AS "phoneMobile", COALESCE(sms_ok, false) AS "smsOk",
      city, state, zip, country,
      persona, category, interest, entry_path AS "entryPath",
      captured_by AS "capturedBy", notes, source_scan_path AS "sourceScanPath",
      COALESCE(payload, '{}'::jsonb) AS payload,
      outreach_target_id AS "outreachTargetId",
      auto_reply_sent_at AS "autoReplySentAt",
      created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  return mapLeadRow(rows[0]);
}

export async function markEventLeadAutoReplied(id: string): Promise<EventLeadRecord | null> {
  await ensureEventLeadsTable();
  const { rows } = await sql<EventLeadRecord>`
    UPDATE marketing_event_leads
    SET
      status = CASE WHEN status = 'new' THEN 'auto_replied' ELSE status END,
      auto_reply_sent_at = now(),
      updated_at = now()
    WHERE id = ${id}
    RETURNING
      id, form_type AS "formType", status,
      event_name AS "eventName", event_dates AS "eventDates", event_key AS "eventKey",
      first_name AS "firstName", last_name AS "lastName", full_name AS "fullName",
      email, phone_mobile AS "phoneMobile", COALESCE(sms_ok, false) AS "smsOk",
      city, state, zip, country,
      persona, category, interest, entry_path AS "entryPath",
      captured_by AS "capturedBy", notes, source_scan_path AS "sourceScanPath",
      COALESCE(payload, '{}'::jsonb) AS payload,
      outreach_target_id AS "outreachTargetId",
      auto_reply_sent_at AS "autoReplySentAt",
      created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  return rows[0] ? mapLeadRow(rows[0]) : null;
}

export async function updateEventLeadStatus(
  id: string,
  status: string
): Promise<EventLeadRecord | null> {
  await ensureEventLeadsTable();
  const allowed = new Set([
    "new",
    "auto_replied",
    "contacted",
    "qualified",
    "converted",
    "paused"
  ]);
  if (!allowed.has(status)) return null;
  const { rows } = await sql<EventLeadRecord>`
    UPDATE marketing_event_leads
    SET status = ${status}, updated_at = now()
    WHERE id = ${id}
    RETURNING
      id, form_type AS "formType", status,
      event_name AS "eventName", event_dates AS "eventDates", event_key AS "eventKey",
      first_name AS "firstName", last_name AS "lastName", full_name AS "fullName",
      email, phone_mobile AS "phoneMobile", COALESCE(sms_ok, false) AS "smsOk",
      city, state, zip, country,
      persona, category, interest, entry_path AS "entryPath",
      captured_by AS "capturedBy", notes, source_scan_path AS "sourceScanPath",
      COALESCE(payload, '{}'::jsonb) AS payload,
      outreach_target_id AS "outreachTargetId",
      auto_reply_sent_at AS "autoReplySentAt",
      created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  return rows[0] ? mapLeadRow(rows[0]) : null;
}

export async function updateEventLead(
  id: string,
  raw: EventLeadSubmitInput & { status?: string | null }
): Promise<EventLeadRecord | null> {
  await ensureEventLeadsTable();
  const existing = await getEventLead(id);
  if (!existing) return null;

  const input = applyLeadDefaults(raw);
  const payload = {
    practice: input.practice ?? null,
    consumer: input.consumer ?? null
  };
  const payloadJson = JSON.stringify(payload);
  const nextStatus = (raw.status || existing.status || "new").trim() || existing.status;

  const { rows } = await sql<EventLeadRecord>`
    UPDATE marketing_event_leads
    SET
      form_type = ${input.formType},
      status = ${nextStatus},
      event_name = ${input.eventName},
      event_dates = ${input.eventDates ?? null},
      event_key = ${input.eventKey ?? null},
      first_name = ${input.firstName ?? null},
      last_name = ${input.lastName ?? null},
      full_name = ${input.fullName ?? null},
      email = ${input.email ?? null},
      phone_mobile = ${input.phoneMobile ?? null},
      sms_ok = ${Boolean(input.smsOk)},
      city = ${input.city ?? null},
      state = ${input.state ?? null},
      zip = ${input.zip ?? null},
      country = ${input.country ?? null},
      persona = ${input.persona ?? null},
      category = ${input.category ?? null},
      interest = ${input.interest ?? null},
      entry_path = ${input.entryPath ?? null},
      captured_by = ${input.capturedBy ?? null},
      notes = ${input.notes ?? null},
      source_scan_path = ${input.sourceScanPath ?? existing.sourceScanPath},
      payload = CAST(${payloadJson} AS jsonb),
      updated_at = now()
    WHERE id = ${id}
    RETURNING
      id, form_type AS "formType", status,
      event_name AS "eventName", event_dates AS "eventDates", event_key AS "eventKey",
      first_name AS "firstName", last_name AS "lastName", full_name AS "fullName",
      email, phone_mobile AS "phoneMobile", COALESCE(sms_ok, false) AS "smsOk",
      city, state, zip, country,
      persona, category, interest, entry_path AS "entryPath",
      captured_by AS "capturedBy", notes, source_scan_path AS "sourceScanPath",
      COALESCE(payload, '{}'::jsonb) AS payload,
      outreach_target_id AS "outreachTargetId",
      auto_reply_sent_at AS "autoReplySentAt",
      created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  const lead = rows[0] ? mapLeadRow(rows[0]) : null;
  if (!lead?.outreachTargetId) return lead;

  try {
    await updateOutreachTarget(lead.outreachTargetId, {
      organization:
        lead.fullName ||
        [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
        lead.email ||
        "Event lead",
      targetType: "individual",
      category: lead.category,
      persona: lead.persona,
      entryPath: lead.entryPath,
      contact: [lead.email, lead.phoneMobile].filter(Boolean).join(" · ") || null,
      notes: [
        `Event lead (${lead.formType})`,
        lead.eventName,
        lead.eventDates,
        lead.notes
      ]
        .filter(Boolean)
        .join(" | "),
      interest: lead.interest
    });
    const contacts = await listOutreachContacts(lead.outreachTargetId);
    const primary = contacts.find((c) => c.isPrimary) || contacts[0];
    if (primary) {
      await updateOutreachContact(primary.id, {
        firstName: lead.firstName,
        lastName: lead.lastName,
        name: lead.fullName,
        email: lead.email,
        phoneMobile: lead.phoneMobile,
        notes: lead.notes
      });
    }
  } catch {
    // Lead save succeeded; outreach sync is best-effort.
  }
  return lead;
}
