import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { sql } from "@vercel/postgres";

const querySchema = z.object({
  email: z.string().email()
});

const updateSchema = z.object({
  email: z.string().email(),
  order: z.array(z.string().uuid())
});

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
  try {
    // Delete existing order for this member
    await sql`
      DELETE FROM member_audio_assignments
      WHERE user_email = ${emailLower}
    `;
    // Insert new order
    if (order.length > 0) {
      await Promise.all(
        order.map((itemId, index) =>
          sql`
            INSERT INTO member_audio_assignments (user_email, library_item_id, assignment_order)
            VALUES (${emailLower}, ${itemId}, ${index + 1})
            ON CONFLICT (user_email, library_item_id) DO UPDATE
            SET assignment_order = ${index + 1}
          `
        )
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    // If table doesn't exist, return error (admin should run schema)
    if (error?.code === "42P01") {
      return NextResponse.json(
        { error: "Database table not found. Please run the schema migration." },
        { status: 500 }
      );
    }
    console.error("Error saving audio order:", error);
    return NextResponse.json({ error: "Failed to save order." }, { status: 500 });
  }
}
