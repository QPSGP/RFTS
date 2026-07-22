import { sql } from "@vercel/postgres";

/** Automated smoke / probe accounts older than this are removed by daily cron. */
export const SMOKE_TEST_USER_MIN_AGE_DAYS = 1;

export type SmokeTestUserRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  referralSource: string | null;
  createdAt: string;
};

export function isLikelySmokeTestEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  return (
    lower.endsWith("@example.invalid") ||
    lower.startsWith("rfts-smoke-") ||
    lower.startsWith("rfts-probe-") ||
    lower.startsWith("rfts-signup-test-") ||
    lower.startsWith("rfts-facilitator-smoke-") ||
    lower.startsWith("smoke-test-")
  );
}

export function isLikelySmokeTestProfile(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  referralSource: string | null | undefined
): boolean {
  if (referralSource === "smoke-test") return true;
  const fn = (firstName || "").trim().toLowerCase();
  const ln = (lastName || "").trim().toLowerCase();
  return fn === "smoke" && ln === "test";
}

function cutoffIso(minAgeDays: number): string {
  const ms = Math.max(0, minAgeDays) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}

function toPgUuidArray(values: string[]): string {
  if (!values.length) return "{}";
  const escaped = values.map((value) =>
    `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  );
  return `{${escaped.join(",")}}`;
}

export async function listSmokeTestUsers(minAgeDays = 0): Promise<SmokeTestUserRow[]> {
  const cutoff = cutoffIso(minAgeDays);
  const { rows } = await sql<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    referralSource: string | null;
    createdAt: string;
  }>`
    SELECT
      u.id,
      u.email,
      mp.first_name AS "firstName",
      mp.last_name AS "lastName",
      mp.referral_source AS "referralSource",
      u.created_at AS "createdAt"
    FROM users u
    LEFT JOIN member_profiles mp ON mp.user_id = u.id
    WHERE
      u.created_at < ${cutoff}::timestamptz
      AND (
        u.email ILIKE 'rfts-smoke-%'
        OR u.email ILIKE '%@example.invalid'
        OR mp.referral_source = 'smoke-test'
        OR (mp.first_name ILIKE 'Smoke' AND mp.last_name ILIKE 'Test')
      )
    ORDER BY u.email
  `;
  return rows;
}

/** Drop given emails from every library item's allowed_user_emails (case-insensitive). */
export async function stripEmailsFromLibraryAllowedLists(emails: string[]): Promise<number> {
  const unique = [
    ...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))
  ];
  if (!unique.length) return 0;

  let updated = 0;
  for (const emailLower of unique) {
    const result = await sql`
      UPDATE library_items
      SET allowed_user_emails = COALESCE(
        (
          SELECT array_agg(e)
          FROM unnest(COALESCE(allowed_user_emails, ARRAY[]::text[])) AS e
          WHERE LOWER(e) <> ${emailLower}
        ),
        ARRAY[]::text[]
      )
      WHERE EXISTS (
        SELECT 1
        FROM unnest(COALESCE(allowed_user_emails, ARRAY[]::text[])) AS e
        WHERE LOWER(e) = ${emailLower}
      )
    `;
    updated += result.rowCount ?? 0;
  }
  return updated;
}

export async function deleteSmokeTestUsersOlderThanDays(minAgeDays: number): Promise<{
  deletedCount: number;
  emails: string[];
  allowedListItemsUpdated: number;
}> {
  const matches = await listSmokeTestUsers(minAgeDays);
  if (!matches.length) {
    return { deletedCount: 0, emails: [], allowedListItemsUpdated: 0 };
  }

  const emails = matches.map((row) => row.email);
  const allowedListItemsUpdated = await stripEmailsFromLibraryAllowedLists(emails);

  const ids = matches.map((row) => row.id);
  const del = await sql`
    DELETE FROM users WHERE id = ANY(${toPgUuidArray(ids)}::uuid[])
  `;

  return {
    deletedCount: del.rowCount ?? 0,
    emails,
    allowedListItemsUpdated
  };
}
