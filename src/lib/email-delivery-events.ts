import { sql } from "@vercel/postgres";
import {
  createOutreachActivity,
  listOutreachContacts,
  updateOutreachTarget
} from "@/lib/db";

export type MarketingEmailEvent = {
  id: string;
  provider: string;
  eventType: string;
  svixId: string | null;
  resendEmailId: string | null;
  recipientEmail: string | null;
  subject: string | null;
  bounceType: string | null;
  bounceSubtype: string | null;
  message: string | null;
  outreachTargetsUpdated: number;
  createdAt: string;
};

let emailEventsTableReady = false;

export async function ensureMarketingEmailEventsTable(): Promise<void> {
  if (emailEventsTableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS marketing_email_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      provider text NOT NULL DEFAULT 'resend',
      event_type text NOT NULL,
      svix_id text,
      resend_email_id text,
      recipient_email text,
      subject text,
      bounce_type text,
      bounce_subtype text,
      message text,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      outreach_targets_updated integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS marketing_email_events_svix_uidx
    ON marketing_email_events (svix_id)
    WHERE svix_id IS NOT NULL
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS marketing_email_events_created_idx
    ON marketing_email_events (created_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS marketing_email_events_recipient_idx
    ON marketing_email_events (lower(recipient_email))
    WHERE recipient_email IS NOT NULL
  `;
  emailEventsTableReady = true;
}

export async function listMarketingEmailEvents(options?: {
  limit?: number;
}): Promise<MarketingEmailEvent[]> {
  await ensureMarketingEmailEventsTable();
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  const { rows } = await sql<MarketingEmailEvent>`
    SELECT
      id,
      provider,
      event_type AS "eventType",
      svix_id AS "svixId",
      resend_email_id AS "resendEmailId",
      recipient_email AS "recipientEmail",
      subject,
      bounce_type AS "bounceType",
      bounce_subtype AS "bounceSubtype",
      message,
      outreach_targets_updated AS "outreachTargetsUpdated",
      created_at AS "createdAt"
    FROM marketing_email_events
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows;
}

export type InsertMarketingEmailEventInput = {
  eventType: string;
  svixId?: string | null;
  resendEmailId?: string | null;
  recipientEmail?: string | null;
  subject?: string | null;
  bounceType?: string | null;
  bounceSubtype?: string | null;
  message?: string | null;
  payload?: Record<string, unknown> | null;
  outreachTargetsUpdated?: number;
};

/**
 * Insert event. Returns null if duplicate svix_id (already processed).
 */
export async function insertMarketingEmailEvent(
  input: InsertMarketingEmailEventInput
): Promise<MarketingEmailEvent | null> {
  await ensureMarketingEmailEventsTable();
  const payloadJson = JSON.stringify(input.payload ?? {});
  try {
    const { rows } = await sql<MarketingEmailEvent>`
      INSERT INTO marketing_email_events (
        event_type, svix_id, resend_email_id, recipient_email, subject,
        bounce_type, bounce_subtype, message, payload, outreach_targets_updated
      ) VALUES (
        ${input.eventType},
        ${input.svixId ?? null},
        ${input.resendEmailId ?? null},
        ${input.recipientEmail ?? null},
        ${input.subject ?? null},
        ${input.bounceType ?? null},
        ${input.bounceSubtype ?? null},
        ${input.message ?? null},
        CAST(${payloadJson} AS jsonb),
        ${input.outreachTargetsUpdated ?? 0}
      )
      RETURNING
        id,
        provider,
        event_type AS "eventType",
        svix_id AS "svixId",
        resend_email_id AS "resendEmailId",
        recipient_email AS "recipientEmail",
        subject,
        bounce_type AS "bounceType",
        bounce_subtype AS "bounceSubtype",
        message,
        outreach_targets_updated AS "outreachTargetsUpdated",
        created_at AS "createdAt"
    `;
    return rows[0] ?? null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/unique|duplicate/i.test(message)) {
      return null;
    }
    throw err;
  }
}

export async function findOutreachTargetIdsByEmail(
  email: string
): Promise<string[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];

  // Ensure outreach tables exist (side effect of list).
  const { listOutreachTargets } = await import("@/lib/db");
  await listOutreachTargets();

  const { rows: contactRows } = await sql<{ targetId: string }>`
    SELECT DISTINCT target_id AS "targetId"
    FROM marketing_outreach_contacts
    WHERE email IS NOT NULL AND lower(trim(email)) = ${normalized}
  `;

  const { rows: targetRows } = await sql<{ id: string }>`
    SELECT id
    FROM marketing_outreach_targets
    WHERE contact IS NOT NULL
      AND position(${normalized} in lower(contact)) > 0
  `;

  const ids = new Set<string>();
  for (const row of contactRows) ids.add(row.targetId);
  for (const row of targetRows) ids.add(row.id);
  return [...ids];
}

/**
 * Mark matching outreach targets do-not-email and log CRM activity.
 * Returns count of targets newly (or already) updated.
 */
export async function markOutreachDoNotEmailForRecipient(input: {
  email: string;
  reason: "bounced" | "complained";
  subject?: string | null;
  detail?: string | null;
}): Promise<{ targetIds: string[]; updatedCount: number }> {
  const targetIds = await findOutreachTargetIdsByEmail(input.email);
  let updatedCount = 0;

  for (const targetId of targetIds) {
    const contacts = await listOutreachContacts(targetId);
    const match = contacts.find(
      (c) => (c.email || "").trim().toLowerCase() === input.email.trim().toLowerCase()
    );
    await updateOutreachTarget(targetId, {
      organization: "",
      doNotEmail: true
    });
    await createOutreachActivity({
      targetId,
      contactId: match?.id ?? null,
      kind: input.reason === "complained" ? "email_complained" : "email_bounced",
      subject:
        input.reason === "complained"
          ? "Marked do-not-email (spam complaint)"
          : "Marked do-not-email (bounce)",
      bodyPreview: [
        input.email,
        input.subject ? `Subject: ${input.subject}` : null,
        input.detail
      ]
        .filter(Boolean)
        .join(" · "),
      meta: {
        recipientEmail: input.email,
        reason: input.reason,
        subject: input.subject ?? null,
        detail: input.detail ?? null
      },
      createdByEmail: "resend-webhook"
    });
    updatedCount += 1;
  }

  return { targetIds, updatedCount };
}
