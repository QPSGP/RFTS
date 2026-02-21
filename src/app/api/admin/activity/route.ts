import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail, getSessionRole } from "@/lib/auth";
import { getModeratorByEmail, recordStaffActivity } from "@/lib/db";

const bodySchema = z.object({
  action: z.string().min(1).max(200)
});

/** Record a staff action (admin or facilitator). Call from frontend when they view a page or perform an action. */
export async function POST(request: Request) {
  const email = getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const role = await getSessionRole();
  if (role !== "admin" && role !== "moderator") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const moderator = role === "moderator" ? await getModeratorByEmail(email) : null;
  await recordStaffActivity(role, email, parsed.data.action, moderator?.name ?? null);
  return NextResponse.json({ ok: true });
}
