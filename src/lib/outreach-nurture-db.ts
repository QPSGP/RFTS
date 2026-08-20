import { sql } from "@vercel/postgres";

export type OutreachNurtureStatus =
  | "active"
  | "paused"
  | "completed"
  | "converted"
  | "stopped";

export type OutreachNurturePlanStep = {
  interest: string;
  templateName: string;
  sentAt?: string | null;
};

export type OutreachNurtureRecord = {
  id: string;
  targetId: string;
  status: OutreachNurtureStatus;
  plan: OutreachNurturePlanStep[];
  nextIndex: number;
  lastSentAt: string | null;
  nextSendAt: string | null;
  stopReason: string | null;
  createdAt: string;
  updatedAt: string;
};

let nurtureTableReady = false;

export async function ensureOutreachNurtureTable() {
  if (nurtureTableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS marketing_outreach_nurture (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      target_id uuid NOT NULL REFERENCES marketing_outreach_targets(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'active',
      plan jsonb NOT NULL DEFAULT '[]'::jsonb,
      next_index integer NOT NULL DEFAULT 0,
      last_sent_at timestamptz,
      next_send_at timestamptz,
      stop_reason text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS marketing_outreach_nurture_target_uidx
      ON marketing_outreach_nurture (target_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS marketing_outreach_nurture_due_idx
      ON marketing_outreach_nurture (next_send_at)
      WHERE status = 'active' AND next_send_at IS NOT NULL
  `;
  nurtureTableReady = true;
}

function mapRow(row: {
  id: string;
  targetId: string;
  status: string;
  plan: unknown;
  nextIndex: number;
  lastSentAt: string | null;
  nextSendAt: string | null;
  stopReason: string | null;
  createdAt: string;
  updatedAt: string;
}): OutreachNurtureRecord {
  const plan = Array.isArray(row.plan)
    ? (row.plan as OutreachNurturePlanStep[])
    : [];
  const status = (
    ["active", "paused", "completed", "converted", "stopped"].includes(row.status)
      ? row.status
      : "stopped"
  ) as OutreachNurtureStatus;
  return {
    id: row.id,
    targetId: row.targetId,
    status,
    plan,
    nextIndex: row.nextIndex,
    lastSentAt: row.lastSentAt,
    nextSendAt: row.nextSendAt,
    stopReason: row.stopReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export async function getOutreachNurtureByTargetId(
  targetId: string
): Promise<OutreachNurtureRecord | null> {
  await ensureOutreachNurtureTable();
  const { rows } = await sql`
    SELECT
      id, target_id AS "targetId", status,
      COALESCE(plan, '[]'::jsonb) AS plan,
      next_index AS "nextIndex",
      last_sent_at AS "lastSentAt",
      next_send_at AS "nextSendAt",
      stop_reason AS "stopReason",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM marketing_outreach_nurture
    WHERE target_id = ${targetId}
    LIMIT 1
  `;
  return rows[0] ? mapRow(rows[0] as Parameters<typeof mapRow>[0]) : null;
}

export async function listOutreachNurture(): Promise<OutreachNurtureRecord[]> {
  await ensureOutreachNurtureTable();
  const { rows } = await sql`
    SELECT
      id, target_id AS "targetId", status,
      COALESCE(plan, '[]'::jsonb) AS plan,
      next_index AS "nextIndex",
      last_sent_at AS "lastSentAt",
      next_send_at AS "nextSendAt",
      stop_reason AS "stopReason",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM marketing_outreach_nurture
    ORDER BY updated_at DESC
  `;
  return rows.map((r) => mapRow(r as Parameters<typeof mapRow>[0]));
}

export async function listDueOutreachNurture(
  nowIso = new Date().toISOString()
): Promise<OutreachNurtureRecord[]> {
  await ensureOutreachNurtureTable();
  const { rows } = await sql`
    SELECT
      id, target_id AS "targetId", status,
      COALESCE(plan, '[]'::jsonb) AS plan,
      next_index AS "nextIndex",
      last_sent_at AS "lastSentAt",
      next_send_at AS "nextSendAt",
      stop_reason AS "stopReason",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM marketing_outreach_nurture
    WHERE status = 'active'
      AND next_send_at IS NOT NULL
      AND next_send_at <= ${nowIso}
    ORDER BY next_send_at ASC
    LIMIT 80
  `;
  return rows.map((r) => mapRow(r as Parameters<typeof mapRow>[0]));
}

export async function upsertOutreachNurture(input: {
  targetId: string;
  plan: OutreachNurturePlanStep[];
  nextSendAt: string;
  status?: OutreachNurtureStatus;
}): Promise<OutreachNurtureRecord> {
  await ensureOutreachNurtureTable();
  const planJson = JSON.stringify(input.plan);
  const status = input.status ?? "active";
  const { rows } = await sql`
    INSERT INTO marketing_outreach_nurture
      (target_id, status, plan, next_index, next_send_at, stop_reason, updated_at)
    VALUES (
      ${input.targetId},
      ${status},
      CAST(${planJson} AS jsonb),
      0,
      ${input.nextSendAt},
      NULL,
      now()
    )
    ON CONFLICT (target_id) DO UPDATE SET
      status = EXCLUDED.status,
      plan = EXCLUDED.plan,
      next_index = 0,
      last_sent_at = NULL,
      next_send_at = EXCLUDED.next_send_at,
      stop_reason = NULL,
      updated_at = now()
    RETURNING
      id, target_id AS "targetId", status,
      COALESCE(plan, '[]'::jsonb) AS plan,
      next_index AS "nextIndex",
      last_sent_at AS "lastSentAt",
      next_send_at AS "nextSendAt",
      stop_reason AS "stopReason",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;
  return mapRow(rows[0] as Parameters<typeof mapRow>[0]);
}

export async function updateOutreachNurture(
  id: string,
  patch: {
    status?: OutreachNurtureStatus;
    plan?: OutreachNurturePlanStep[];
    nextIndex?: number;
    lastSentAt?: string | null;
    nextSendAt?: string | null;
    stopReason?: string | null;
  }
): Promise<OutreachNurtureRecord | null> {
  await ensureOutreachNurtureTable();
  const existing = (await sql`
    SELECT
      id, target_id AS "targetId", status,
      COALESCE(plan, '[]'::jsonb) AS plan,
      next_index AS "nextIndex",
      last_sent_at AS "lastSentAt",
      next_send_at AS "nextSendAt",
      stop_reason AS "stopReason",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM marketing_outreach_nurture
    WHERE id = ${id}
    LIMIT 1
  `).rows[0];
  if (!existing) return null;
  const cur = mapRow(existing as Parameters<typeof mapRow>[0]);
  const plan = patch.plan ?? cur.plan;
  const planJson = JSON.stringify(plan);
  const { rows } = await sql`
    UPDATE marketing_outreach_nurture
    SET
      status = ${patch.status ?? cur.status},
      plan = CAST(${planJson} AS jsonb),
      next_index = ${patch.nextIndex ?? cur.nextIndex},
      last_sent_at = ${patch.lastSentAt !== undefined ? patch.lastSentAt : cur.lastSentAt},
      next_send_at = ${patch.nextSendAt !== undefined ? patch.nextSendAt : cur.nextSendAt},
      stop_reason = ${patch.stopReason !== undefined ? patch.stopReason : cur.stopReason},
      updated_at = now()
    WHERE id = ${id}
    RETURNING
      id, target_id AS "targetId", status,
      COALESCE(plan, '[]'::jsonb) AS plan,
      next_index AS "nextIndex",
      last_sent_at AS "lastSentAt",
      next_send_at AS "nextSendAt",
      stop_reason AS "stopReason",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;
  return rows[0] ? mapRow(rows[0] as Parameters<typeof mapRow>[0]) : null;
}
