import { sql } from "@vercel/postgres";

export type OutreachCampaignStatus =
  | "draft"
  | "awaiting_approval"
  | "ready_to_send"
  | "sending"
  | "completed"
  | "cancelled";

export type OutreachCampaignRecipientStatus =
  | "draft"
  | "approved"
  | "sent"
  | "skipped_unsubscribed"
  | "skipped_converted"
  | "skipped_no_email"
  | "error";

export type OutreachCampaign = {
  id: string;
  name: string;
  templateName: string | null;
  templateId: string | null;
  query: Record<string, unknown>;
  status: OutreachCampaignStatus;
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OutreachCampaignRecipient = {
  id: string;
  campaignId: string;
  targetId: string;
  contactId: string | null;
  email: string | null;
  subject: string;
  bodyText: string;
  status: OutreachCampaignRecipientStatus;
  skipReason: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OutreachCampaignCounts = {
  total: number;
  draft: number;
  approved: number;
  sent: number;
  skipped: number;
  error: number;
};

export type OutreachCampaignSummary = OutreachCampaign & {
  counts: OutreachCampaignCounts;
};

let campaignTablesReady = false;

export async function ensureOutreachCampaignTables() {
  if (campaignTablesReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS marketing_outreach_campaigns (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      template_name text,
      template_id uuid,
      query jsonb NOT NULL DEFAULT '{}'::jsonb,
      status text NOT NULL DEFAULT 'awaiting_approval',
      created_by_email text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS marketing_outreach_campaign_recipients (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id uuid NOT NULL REFERENCES marketing_outreach_campaigns(id) ON DELETE CASCADE,
      target_id uuid NOT NULL REFERENCES marketing_outreach_targets(id) ON DELETE CASCADE,
      contact_id uuid REFERENCES marketing_outreach_contacts(id) ON DELETE SET NULL,
      email text,
      subject text NOT NULL,
      body_text text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      skip_reason text,
      sent_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS marketing_outreach_campaigns_status_idx
      ON marketing_outreach_campaigns (status, created_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS marketing_outreach_campaign_recipients_campaign_idx
      ON marketing_outreach_campaign_recipients (campaign_id, status)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS marketing_outreach_campaign_recipients_email_idx
      ON marketing_outreach_campaign_recipients (lower(email))
      WHERE email IS NOT NULL
  `;
  campaignTablesReady = true;
}

const CAMPAIGN_STATUSES = new Set<OutreachCampaignStatus>([
  "draft",
  "awaiting_approval",
  "ready_to_send",
  "sending",
  "completed",
  "cancelled"
]);

const RECIPIENT_STATUSES = new Set<OutreachCampaignRecipientStatus>([
  "draft",
  "approved",
  "sent",
  "skipped_unsubscribed",
  "skipped_converted",
  "skipped_no_email",
  "error"
]);

type CampaignSqlRow = {
  id: string;
  name: string;
  templateName: string | null;
  templateId: string | null;
  query: unknown;
  status: string;
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  return "";
}

function toIsoOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  const iso = toIso(value);
  return iso || null;
}

type RecipientSqlRow = {
  id: string;
  campaignId: string;
  targetId: string;
  contactId: string | null;
  email: string | null;
  subject: string;
  bodyText: string;
  status: string;
  skipReason: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapCampaign(row: CampaignSqlRow): OutreachCampaign {
  const status = (
    CAMPAIGN_STATUSES.has(row.status as OutreachCampaignStatus) ? row.status : "cancelled"
  ) as OutreachCampaignStatus;
  const query =
    row.query && typeof row.query === "object" && !Array.isArray(row.query)
      ? (row.query as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    name: row.name,
    templateName: row.templateName,
    templateId: row.templateId,
    query,
    status,
    createdByEmail: row.createdByEmail,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

function mapRecipient(row: RecipientSqlRow): OutreachCampaignRecipient {
  const status = (
    RECIPIENT_STATUSES.has(row.status as OutreachCampaignRecipientStatus)
      ? row.status
      : "error"
  ) as OutreachCampaignRecipientStatus;
  return {
    id: row.id,
    campaignId: row.campaignId,
    targetId: row.targetId,
    contactId: row.contactId,
    email: row.email,
    subject: row.subject,
    bodyText: row.bodyText,
    status,
    skipReason: row.skipReason,
    sentAt: toIsoOrNull(row.sentAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt)
  };
}

export async function createOutreachCampaign(input: {
  name: string;
  templateName?: string | null;
  templateId?: string | null;
  query?: Record<string, unknown>;
  createdByEmail?: string | null;
  status?: OutreachCampaignStatus;
}): Promise<OutreachCampaign> {
  await ensureOutreachCampaignTables();
  const { rows } = await sql`
    INSERT INTO marketing_outreach_campaigns
      (name, template_name, template_id, query, status, created_by_email)
    VALUES (
      ${input.name},
      ${input.templateName ?? null},
      ${input.templateId ?? null},
      CAST(${JSON.stringify(input.query ?? {})} AS jsonb),
      ${input.status ?? "awaiting_approval"},
      ${input.createdByEmail ?? null}
    )
    RETURNING
      id, name,
      template_name AS "templateName",
      template_id AS "templateId",
      COALESCE(query, '{}'::jsonb) AS query,
      status,
      created_by_email AS "createdByEmail",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;
  return mapCampaign(rows[0] as CampaignSqlRow);
}

export async function listOutreachCampaigns(): Promise<OutreachCampaign[]> {
  await ensureOutreachCampaignTables();
  const { rows } = await sql`
    SELECT
      id, name,
      template_name AS "templateName",
      template_id AS "templateId",
      COALESCE(query, '{}'::jsonb) AS query,
      status,
      created_by_email AS "createdByEmail",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM marketing_outreach_campaigns
    ORDER BY created_at DESC
    LIMIT 500
  `;
  return rows.map((row) => mapCampaign(row as CampaignSqlRow));
}

type CampaignSummarySqlRow = CampaignSqlRow & {
  total: number | string | null;
  draft: number | string | null;
  approved: number | string | null;
  sent: number | string | null;
  skipped: number | string | null;
  error: number | string | null;
};

function toCount(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function listOutreachCampaignSummaries(): Promise<OutreachCampaignSummary[]> {
  await ensureOutreachCampaignTables();
  const { rows } = await sql`
    SELECT
      c.id, c.name,
      c.template_name AS "templateName",
      c.template_id AS "templateId",
      COALESCE(c.query, '{}'::jsonb) AS query,
      c.status,
      c.created_by_email AS "createdByEmail",
      c.created_at AS "createdAt",
      c.updated_at AS "updatedAt",
      COALESCE(s.total, 0)::int AS total,
      COALESCE(s.draft, 0)::int AS draft,
      COALESCE(s.approved, 0)::int AS approved,
      COALESCE(s.sent, 0)::int AS sent,
      COALESCE(s.skipped, 0)::int AS skipped,
      COALESCE(s.error, 0)::int AS error
    FROM marketing_outreach_campaigns c
    LEFT JOIN (
      SELECT
        campaign_id,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
        COUNT(*) FILTER (WHERE status LIKE 'skipped_%')::int AS skipped,
        COUNT(*) FILTER (WHERE status = 'error')::int AS error
      FROM marketing_outreach_campaign_recipients
      GROUP BY campaign_id
    ) s ON s.campaign_id = c.id
    ORDER BY c.created_at DESC
    LIMIT 500
  `;
  return rows.map((row) => {
    const summary = row as CampaignSummarySqlRow;
    return {
      ...mapCampaign(summary),
      counts: {
        total: toCount(summary.total),
        draft: toCount(summary.draft),
        approved: toCount(summary.approved),
        sent: toCount(summary.sent),
        skipped: toCount(summary.skipped),
        error: toCount(summary.error)
      }
    };
  });
}

export async function getOutreachCampaign(id: string): Promise<OutreachCampaign | null> {
  await ensureOutreachCampaignTables();
  const { rows } = await sql`
    SELECT
      id, name,
      template_name AS "templateName",
      template_id AS "templateId",
      COALESCE(query, '{}'::jsonb) AS query,
      status,
      created_by_email AS "createdByEmail",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM marketing_outreach_campaigns
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ? mapCampaign(rows[0] as CampaignSqlRow) : null;
}

export async function updateOutreachCampaign(
  id: string,
  input: { status?: OutreachCampaignStatus; name?: string }
): Promise<OutreachCampaign | null> {
  await ensureOutreachCampaignTables();
  const existing = await getOutreachCampaign(id);
  if (!existing) return null;
  const status = input.status ?? existing.status;
  const name = input.name?.trim() || existing.name;
  const { rows } = await sql`
    UPDATE marketing_outreach_campaigns
    SET name = ${name}, status = ${status}, updated_at = now()
    WHERE id = ${id}
    RETURNING
      id, name,
      template_name AS "templateName",
      template_id AS "templateId",
      COALESCE(query, '{}'::jsonb) AS query,
      status,
      created_by_email AS "createdByEmail",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;
  return rows[0] ? mapCampaign(rows[0] as CampaignSqlRow) : null;
}

export async function createOutreachCampaignRecipient(input: {
  campaignId: string;
  targetId: string;
  contactId?: string | null;
  email?: string | null;
  subject: string;
  bodyText: string;
  status?: OutreachCampaignRecipientStatus;
}): Promise<OutreachCampaignRecipient> {
  await ensureOutreachCampaignTables();
  const { rows } = await sql`
    INSERT INTO marketing_outreach_campaign_recipients
      (campaign_id, target_id, contact_id, email, subject, body_text, status)
    VALUES (
      ${input.campaignId},
      ${input.targetId},
      ${input.contactId ?? null},
      ${input.email ?? null},
      ${input.subject},
      ${input.bodyText},
      ${input.status ?? "draft"}
    )
    RETURNING
      id, campaign_id AS "campaignId", target_id AS "targetId",
      contact_id AS "contactId", email, subject,
      body_text AS "bodyText", status,
      skip_reason AS "skipReason", sent_at AS "sentAt",
      created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  return mapRecipient(rows[0] as RecipientSqlRow);
}

export async function listOutreachCampaignRecipients(
  campaignId: string
): Promise<OutreachCampaignRecipient[]> {
  await ensureOutreachCampaignTables();
  const { rows } = await sql`
    SELECT
      id, campaign_id AS "campaignId", target_id AS "targetId",
      contact_id AS "contactId", email, subject,
      body_text AS "bodyText", status,
      skip_reason AS "skipReason", sent_at AS "sentAt",
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM marketing_outreach_campaign_recipients
    WHERE campaign_id = ${campaignId}
    ORDER BY created_at ASC
  `;
  return rows.map((row) => mapRecipient(row as RecipientSqlRow));
}

export async function getOutreachCampaignRecipient(
  id: string
): Promise<OutreachCampaignRecipient | null> {
  await ensureOutreachCampaignTables();
  const { rows } = await sql`
    SELECT
      id, campaign_id AS "campaignId", target_id AS "targetId",
      contact_id AS "contactId", email, subject,
      body_text AS "bodyText", status,
      skip_reason AS "skipReason", sent_at AS "sentAt",
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM marketing_outreach_campaign_recipients
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ? mapRecipient(rows[0] as RecipientSqlRow) : null;
}

export async function updateOutreachCampaignRecipient(
  id: string,
  input: {
    status?: OutreachCampaignRecipientStatus;
    skipReason?: string | null;
    sentAt?: string | null;
    subject?: string;
    bodyText?: string;
  }
): Promise<OutreachCampaignRecipient | null> {
  await ensureOutreachCampaignTables();
  const existing = await getOutreachCampaignRecipient(id);
  if (!existing) return null;
  const status = input.status ?? existing.status;
  const skipReason = input.skipReason !== undefined ? input.skipReason : existing.skipReason;
  const sentAt = input.sentAt !== undefined ? input.sentAt : existing.sentAt;
  const subject = input.subject ?? existing.subject;
  const bodyText = input.bodyText ?? existing.bodyText;
  const { rows } = await sql`
    UPDATE marketing_outreach_campaign_recipients
    SET
      status = ${status},
      skip_reason = ${skipReason},
      sent_at = ${sentAt},
      subject = ${subject},
      body_text = ${bodyText},
      updated_at = now()
    WHERE id = ${id}
    RETURNING
      id, campaign_id AS "campaignId", target_id AS "targetId",
      contact_id AS "contactId", email, subject,
      body_text AS "bodyText", status,
      skip_reason AS "skipReason", sent_at AS "sentAt",
      created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  return rows[0] ? mapRecipient(rows[0] as RecipientSqlRow) : null;
}

export async function listOpenCampaignRecipientsByEmail(
  email: string
): Promise<OutreachCampaignRecipient[]> {
  await ensureOutreachCampaignTables();
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];
  const { rows } = await sql`
    SELECT
      id, campaign_id AS "campaignId", target_id AS "targetId",
      contact_id AS "contactId", email, subject,
      body_text AS "bodyText", status,
      skip_reason AS "skipReason", sent_at AS "sentAt",
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM marketing_outreach_campaign_recipients
    WHERE lower(email) = ${normalized}
      AND status IN ('draft', 'approved')
  `;
  return rows.map((row) => mapRecipient(row as RecipientSqlRow));
}

export async function listOpenCampaignRecipientsByTarget(
  targetId: string
): Promise<OutreachCampaignRecipient[]> {
  await ensureOutreachCampaignTables();
  const { rows } = await sql`
    SELECT
      id, campaign_id AS "campaignId", target_id AS "targetId",
      contact_id AS "contactId", email, subject,
      body_text AS "bodyText", status,
      skip_reason AS "skipReason", sent_at AS "sentAt",
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM marketing_outreach_campaign_recipients
    WHERE target_id = ${targetId}
      AND status IN ('draft', 'approved')
  `;
  return rows.map((row) => mapRecipient(row as RecipientSqlRow));
}
