import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import {
  MANAGED_MAX_ROTATION_SLOTS,
  MANAGED_MAX_SLOTS_PER_AUDIO
} from "@/lib/managed-rotation-limits";

const querySchema = z.object({
  email: z.string().email()
});

const updateSchema = z.object({
  email: z.string().email(),
  order: z.array(z.string().uuid()).max(MANAGED_MAX_ROTATION_SLOTS)
});

/** Walk Neon/pg nested errors for Postgres fields. */
function readPgError(error: unknown): {
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

function orderSaveErrorMessage(error: unknown): string {
  const pg = readPgError(error);
  if (pg?.code === "23503") {
    return (
      "Order save failed: one or more rotation steps reference a library item that does not exist in the database. " +
      "Refresh the admin page, remove orphan steps, and re-add the track from the library list."
    );
  }
  if (pg?.code === "23505") {
    const hint =
      pg.constraint?.includes("library_item") || pg.detail?.includes("library_item")
        ? "Your database may still enforce only one row per recording per member. Run the latest scripts/schema.sql migration (member_audio_assignments) so the same audio can appear in multiple rotation slots."
        : "A uniqueness constraint rejected this order. Check assignment_order conflicts or run schema migrations.";
    return `Order save failed: ${hint}`;
  }
  if (pg?.message) {
    return `Order save failed: ${pg.message}`;
  }
  return "Failed to save order.";
}

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    email: url.searchParams.get("email")
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  const { email } = parsed.data;
  try {
    // Check if table exists, if not return empty order
    const { rows } = await sql<{ library_item_id: string }>`
      SELECT library_item_id
      FROM member_audio_assignments
      WHERE user_email = ${email.toLowerCase()}
      ORDER BY assignment_order ASC
    `;
    const order = rows.map((row) => row.library_item_id);
    return NextResponse.json({ order });
  } catch (error: any) {
    // If table doesn't exist, return empty order (table will be created by schema)
    if (error?.code === "42P01") {
      return NextResponse.json({ order: [] });
    }
    console.error("Error loading audio order:", error);
    return NextResponse.json({ error: "Failed to load order." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { email, order } = parsed.data;
  const emailLower = email.toLowerCase();
  const perId = new Map<string, number>();
  for (const itemId of order) {
    perId.set(itemId, (perId.get(itemId) || 0) + 1);
    if ((perId.get(itemId) || 0) > MANAGED_MAX_SLOTS_PER_AUDIO) {
      return NextResponse.json(
        { error: `Each audio may appear at most ${MANAGED_MAX_SLOTS_PER_AUDIO} times in the rotation.` },
        { status: 400 }
      );
    }
  }
  try {
    // Delete then insert sequentially (avoids many parallel pool queries; keeps failures simpler).
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
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const anyErr = error as { code?: string };
    if (anyErr?.code === "42P01") {
      return NextResponse.json(
        { error: "Database table not found. Please run the schema migration." },
        { status: 500 }
      );
    }
    console.error("Error saving audio order:", error);
    const message = orderSaveErrorMessage(error);
    const pg = readPgError(error);
    const status = pg?.code === "23503" || pg?.code === "23505" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
