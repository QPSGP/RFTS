import { sql } from "@vercel/postgres";
import { MANAGED_MAX_SLOTS_PER_AUDIO } from "@/lib/managed-rotation-limits";

/** Walk Neon/pg nested errors for Postgres fields. */
export function readPgError(error: unknown): {
  code?: string;
  detail?: string;
  constraint?: string;
  message?: string;
} | null {
  let cur: unknown = error;
  for (let depth = 0; depth < 8 && cur !== null && cur !== undefined; depth++) {
    if (typeof cur === "object") {
      const o = cur as Record<string, unknown>;
      const code = o.code;
      if (typeof code === "string" && /^\d{5}$/.test(code)) {
        return {
          code,
          detail: typeof o.detail === "string" ? o.detail : undefined,
          constraint: typeof o.constraint === "string" ? o.constraint : undefined,
          message: typeof o.message === "string" ? o.message : undefined
        };
      }
      cur = o.cause ?? o.originalError ?? o.error ?? null;
      continue;
    }
    break;
  }
  return null;
}

export function orderSaveErrorMessage(error: unknown): string {
  const pg = readPgError(error);
  if (pg?.code === "23503") {
    return (
      "Order save failed: one or more rotation steps reference a library item that does not exist in the database. " +
      "Refresh the page, remove orphan steps, and re-add the track from the library list."
    );
  }
  if (pg?.code === "23505") {
    const hint =
      pg.constraint === "member_audio_assignments_pkey" ||
      pg.constraint?.includes("library_item") ||
      pg.detail?.includes("library_item")
        ? "Your database still uses the legacy PRIMARY KEY (user_email, library_item_id). Run scripts/fix-managed-rotation-duplicate-slots.sql (Step 1 replaces that PK with PRIMARY KEY (id))."
        : "A uniqueness constraint rejected this order. Check assignment_order conflicts or run schema migrations.";
    const meta = [pg.constraint && `constraint=${pg.constraint}`, pg.detail && `detail=${pg.detail}`]
      .filter(Boolean)
      .join("; ");
    return meta ? `${hint} [${meta}]` : hint;
  }
  if (pg?.message) {
    return `Order save failed: ${pg.message}`;
  }
  return "Failed to save order.";
}

export type SaveMemberAudioOrderResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export async function saveMemberAudioOrder(
  email: string,
  order: string[]
): Promise<SaveMemberAudioOrderResult> {
  const emailLower = email.toLowerCase();
  const perId = new Map<string, number>();
  for (const itemId of order) {
    perId.set(itemId, (perId.get(itemId) || 0) + 1);
    if ((perId.get(itemId) || 0) > MANAGED_MAX_SLOTS_PER_AUDIO) {
      return {
        ok: false,
        status: 400,
        error: `Each audio may appear at most ${MANAGED_MAX_SLOTS_PER_AUDIO} times in the rotation.`
      };
    }
  }
  try {
    await sql`
      DELETE FROM member_audio_assignments
      WHERE user_email = ${emailLower}
    `;
    for (let index = 0; index < order.length; index++) {
      const itemId = order[index];
      await sql`
        INSERT INTO member_audio_assignments (user_email, library_item_id, assignment_order)
        VALUES (${emailLower}, ${itemId}, ${index + 1})
      `;
    }
    return { ok: true };
  } catch (error: unknown) {
    const anyErr = error as { code?: string };
    if (anyErr?.code === "42P01") {
      return {
        ok: false,
        status: 500,
        error: "Database table not found. Please run the schema migration."
      };
    }
    console.error("Error saving audio order:", error);
    const message = orderSaveErrorMessage(error);
    const pg = readPgError(error);
    const status = pg?.code === "23503" || pg?.code === "23505" ? 400 : 500;
    return { ok: false, status, error: message };
  }
}
