import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSessionEmail } from "@/lib/user-auth";
import { getUserProfile, recordMemberActivity } from "@/lib/db";

const bodySchema = z.object({
  action: z.string().min(1).max(200),
  details: z.string().max(500).optional()
});

/** Record a member action (e.g. viewed console, viewed library). Call from member frontend. */
export async function POST(request: Request) {
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  await recordMemberActivity(profile.id, parsed.data.action, parsed.data.details ?? null);
  return NextResponse.json({ ok: true });
}
