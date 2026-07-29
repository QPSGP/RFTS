import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import {
  createOutreachActivity,
  getOutreachTarget,
  listOutreachActivities
} from "@/lib/db";

const noteSchema = z.object({
  targetId: z.string().uuid(),
  subject: z.string().trim().max(200).nullish(),
  body: z.string().trim().max(4000).nullish(),
  contactId: z.string().uuid().nullish()
});

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const targetId = new URL(request.url).searchParams.get("targetId") || "";
  if (!targetId) {
    return NextResponse.json({ error: "Missing targetId." }, { status: 400 });
  }
  const target = await getOutreachTarget(targetId);
  if (!target) {
    return NextResponse.json({ error: "Target not found." }, { status: 404 });
  }
  const activities = await listOutreachActivities(targetId);
  return NextResponse.json({ activities });
}

/** Log a manual note / call on the activity timeline. */
export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const target = await getOutreachTarget(parsed.data.targetId);
  if (!target) {
    return NextResponse.json({ error: "Target not found." }, { status: 404 });
  }
  const activity = await createOutreachActivity({
    targetId: parsed.data.targetId,
    contactId: parsed.data.contactId ?? null,
    kind: "note",
    subject: parsed.data.subject?.trim() || "Note",
    bodyPreview: (parsed.data.body || "").slice(0, 500) || null,
    createdByEmail: getSessionEmail()
  });
  return NextResponse.json({ ok: true, activity });
}
