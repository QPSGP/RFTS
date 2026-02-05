import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import {
  createInterest,
  deleteInterest,
  listInterests,
  updateInterest
} from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional()
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  description: z.string().optional(),
  audioIdA: z.string().uuid().nullable().optional(),
  audioIdB: z.string().uuid().nullable().optional(),
  audioIdC: z.string().uuid().nullable().optional()
});

const deleteSchema = z.object({
  id: z.string()
});

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ interests: await listInterests() });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const record = await createInterest(parsed.data.name, parsed.data.description);
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
  const record = await updateInterest(
    parsed.data.id,
    parsed.data.name,
    parsed.data.description,
    parsed.data.audioIdA !== undefined || parsed.data.audioIdB !== undefined || parsed.data.audioIdC !== undefined
      ? {
          a: parsed.data.audioIdA ?? null,
          b: parsed.data.audioIdB ?? null,
          c: parsed.data.audioIdC ?? null
        }
      : undefined
  );
  if (!record) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  await deleteInterest(parsed.data.id);
  return NextResponse.json({ ok: true });
}
