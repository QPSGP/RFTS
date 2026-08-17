/**
 * Process Resend webhook email events (bounce / complaint) for Marketing.
 */

import { sql } from "@vercel/postgres";
import {
  ensureMarketingEmailEventsTable,
  insertMarketingEmailEvent,
  markOutreachDoNotEmailForRecipient
} from "@/lib/email-delivery-events";

export type ResendWebhookEnvelope = {
  type?: string;
  created_at?: string;
  data?: Record<string, unknown>;
};

function asString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function firstRecipient(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  const to = data.to;
  if (Array.isArray(to)) {
    for (const item of to) {
      const s = asString(item);
      if (s) return s.toLowerCase();
    }
  }
  return asString(to)?.toLowerCase() ?? null;
}

function bounceMeta(data: Record<string, unknown> | undefined): {
  bounceType: string | null;
  bounceSubtype: string | null;
  message: string | null;
} {
  const bounce =
    data?.bounce && typeof data.bounce === "object" && !Array.isArray(data.bounce)
      ? (data.bounce as Record<string, unknown>)
      : null;
  return {
    bounceType: asString(bounce?.type),
    bounceSubtype: asString(bounce?.subType) || asString(bounce?.subtype),
    message: asString(bounce?.message) || asString(data?.message)
  };
}

export function normalizeResendEventType(
  type: string | null | undefined
): "bounced" | "complained" | null {
  const t = (type || "").trim().toLowerCase();
  if (t === "email.bounced" || t === "bounced") return "bounced";
  if (t === "email.complained" || t === "complained") return "complained";
  return null;
}

export async function processResendEmailWebhook(input: {
  envelope: ResendWebhookEnvelope;
  svixId?: string | null;
}): Promise<{
  handled: boolean;
  duplicate?: boolean;
  eventType?: string;
  recipientEmail?: string | null;
  outreachTargetsUpdated?: number;
}> {
  const eventType = normalizeResendEventType(input.envelope.type);
  if (!eventType) {
    return { handled: false };
  }

  const data = input.envelope.data || {};
  const recipientEmail = firstRecipient(data);
  const subject = asString(data.subject);
  const resendEmailId = asString(data.email_id) || asString(data.emailId);
  const { bounceType, bounceSubtype, message } = bounceMeta(data);

  // Claim the event first so retries / duplicate deliveries are no-ops.
  const inserted = await insertMarketingEmailEvent({
    eventType,
    svixId: input.svixId ?? null,
    resendEmailId,
    recipientEmail,
    subject,
    bounceType,
    bounceSubtype,
    message,
    payload: input.envelope as unknown as Record<string, unknown>,
    outreachTargetsUpdated: 0
  });

  if (!inserted) {
    return {
      handled: true,
      duplicate: true,
      eventType,
      recipientEmail,
      outreachTargetsUpdated: 0
    };
  }

  let outreachTargetsUpdated = 0;
  if (recipientEmail) {
    const result = await markOutreachDoNotEmailForRecipient({
      email: recipientEmail,
      reason: eventType,
      subject,
      detail: [bounceType, bounceSubtype, message].filter(Boolean).join(" / ") || null
    });
    outreachTargetsUpdated = result.updatedCount;
    if (outreachTargetsUpdated > 0) {
      await ensureMarketingEmailEventsTable();
      await sql`
        UPDATE marketing_email_events
        SET outreach_targets_updated = ${outreachTargetsUpdated}
        WHERE id = ${inserted.id}
      `;
    }
  }

  return {
    handled: true,
    eventType,
    recipientEmail,
    outreachTargetsUpdated
  };
}
