import crypto from "crypto";
import { sql } from "@vercel/postgres";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let schemaPromise: Promise<void> | null = null;

export function ensureAuthHardeningSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz`;
      await sql`ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_changed_at timestamptz`;
      await sql`ALTER TABLE moderators ADD COLUMN IF NOT EXISTS password_changed_at timestamptz`;
      await sql`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          id text PRIMARY KEY,
          email text NOT NULL,
          kind text NOT NULL,
          expires_at timestamptz NOT NULL
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS auth_sessions_email_kind
        ON auth_sessions (email, kind)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS used_auth_tokens (
          token_hash text PRIMARY KEY,
          kind text NOT NULL,
          expires_at timestamptz NOT NULL
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS request_rate_limits (
          bucket text PRIMARY KEY,
          hits integer NOT NULL,
          window_start timestamptz NOT NULL
        )
      `;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export async function insertAuthSession(input: {
  id: string;
  email: string;
  kind: "member" | "staff";
}): Promise<void> {
  await ensureAuthHardeningSchema();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await sql`
    INSERT INTO auth_sessions (id, email, kind, expires_at)
    VALUES (${input.id}, ${input.email}, ${input.kind}, ${expiresAt})
  `;
}

export async function authSessionActive(
  id: string,
  kind: "member" | "staff"
): Promise<boolean> {
  try {
    await ensureAuthHardeningSchema();
    const { rows } = await sql<{ id: string }>`
      SELECT id FROM auth_sessions
      WHERE id = ${id} AND kind = ${kind} AND expires_at > now()
      LIMIT 1
    `;
    return rows.length > 0;
  } catch (error) {
    console.error("[auth-session] lookup failed", error);
    return false;
  }
}

export async function deleteAuthSession(id: string): Promise<void> {
  try {
    await sql`DELETE FROM auth_sessions WHERE id = ${id}`;
  } catch (error) {
    console.error("[auth-session] delete failed", error);
  }
}

export async function revokeAuthSessions(
  email: string,
  kind: "member" | "staff"
): Promise<void> {
  try {
    await ensureAuthHardeningSchema();
    await sql`
      DELETE FROM auth_sessions
      WHERE kind = ${kind} AND lower(email) = lower(${email})
    `;
  } catch (error) {
    console.error("[auth-session] revoke failed", error);
  }
}

function stampAllows(stamp: Date | string | null | undefined, issuedAtMs: number): boolean {
  if (!stamp) return true;
  const ms = new Date(stamp).getTime();
  if (Number.isNaN(ms)) return true;
  return issuedAtMs >= ms;
}

/**
 * Cookies with no session id stay valid until the password changes.
 * A missing stamp (current accounts) does not log anyone out.
 */
export async function legacyCredentialAllows(
  email: string,
  issuedAtMs: number,
  kind: "member" | "staff"
): Promise<boolean> {
  try {
    await ensureAuthHardeningSchema();
    if (kind === "member") {
      const { rows } = await sql<{ password_changed_at: Date | null }>`
        SELECT password_changed_at
        FROM users
        WHERE lower(email) = lower(${email})
        LIMIT 1
      `;
      return stampAllows(rows[0]?.password_changed_at, issuedAtMs);
    }
    const { rows: admins } = await sql<{ password_changed_at: Date | null }>`
      SELECT password_changed_at
      FROM admins
      WHERE lower(email) = lower(${email})
      LIMIT 1
    `;
    const { rows: moderators } = await sql<{ password_changed_at: Date | null }>`
      SELECT password_changed_at
      FROM moderators
      WHERE lower(email) = lower(${email})
      LIMIT 1
    `;
    const stamps = [admins[0]?.password_changed_at, moderators[0]?.password_changed_at];
    return stamps.every((stamp) => stampAllows(stamp, issuedAtMs));
  } catch (error) {
    console.error("[auth-session] legacy check failed; keeping current cookie", error);
    return true;
  }
}

export async function consumeAuthToken(token: string, kind: string): Promise<boolean> {
  try {
    await ensureAuthHardeningSchema();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { rows } = await sql<{ token_hash: string }>`
      INSERT INTO used_auth_tokens (token_hash, kind, expires_at)
      VALUES (${tokenHash}, ${kind}, ${expiresAt})
      ON CONFLICT (token_hash) DO NOTHING
      RETURNING token_hash
    `;
    return rows.length > 0;
  } catch (error) {
    console.error("[auth-token] consume failed", error);
    return false;
  }
}

export function newSessionId(): string {
  return crypto.randomBytes(16).toString("hex");
}
