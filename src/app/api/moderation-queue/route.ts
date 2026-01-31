import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import {
  createModerationItem,
  listModerationQueue,
  updateModerationItem
} from "@/lib/db";

const submitSchema = z.object({
  title: z.string().min(2),
  creator: z.string().min(2)
});

const updateSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  notes: z.string().optional()
});

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const queue = await listModerationQueue();
  return NextResponse.json({ queue });
}

export async function POST(request: Request) {
  const submissionKey = request.headers.get("x-submission-key");
  if (process.env.SUBMISSION_KEY && submissionKey !== process.env.SUBMISSION_KEY) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const record = await createModerationItem(parsed.data);
  return NextResponse.json({ ok: true, record });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const record = await updateModerationItem({
    id: parsed.data.id,
    status: parsed.data.status,
    notes: parsed.data.notes
  });
  if (!record) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
