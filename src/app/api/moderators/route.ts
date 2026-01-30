import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail } from "@/lib/auth";
import { getModerationQueue, saveModerationQueue } from "@/lib/storage";

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
  const sessionEmail = getSessionEmail();
  if (!sessionEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const queue = getModerationQueue();
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
  const queue = getModerationQueue();
  const record = {
    id: crypto.randomUUID(),
    ...parsed.data,
    submittedAt: new Date().toISOString(),
    status: "pending" as const
  };
  queue.unshift(record);
  saveModerationQueue(queue);
  return NextResponse.json({ ok: true, record });
}

export async function PATCH(request: Request) {
  const sessionEmail = getSessionEmail();
  if (!sessionEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const queue = getModerationQueue();
  const index = queue.findIndex((item) => item.id === parsed.data.id);
  if (index === -1) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  queue[index] = {
    ...queue[index],
    status: parsed.data.status,
    notes: parsed.data.notes
  };
  saveModerationQueue(queue);
  return NextResponse.json({ ok: true });
}
