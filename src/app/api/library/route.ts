import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { getLibrary, saveLibrary } from "@/lib/storage";

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  coverUrl: z.string().optional().default(""),
  audioUrl: z.string().optional().default(""),
  interestIds: z.array(z.string()).default([]),
  allowedUserEmails: z.array(z.string().email()).optional().default([])
});

const updateSchema = z.object({
  id: z.string(),
  title: z.string().min(2),
  description: z.string().min(2),
  coverUrl: z.string().optional().default(""),
  audioUrl: z.string().optional().default(""),
  interestIds: z.array(z.string()).default([]),
  allowedUserEmails: z.array(z.string().email()).optional().default([]),
  order: z.number().int().optional(),
  isAdult: z.boolean().optional()
});

const deleteSchema = z.object({
  id: z.string()
});

const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1)
});

export async function GET() {
  if (!isAdminSession()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ library: getLibrary() });
}

export async function POST(request: Request) {
  if (!isAdminSession()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const library = getLibrary();
  const maxOrder = library.reduce((max, item) => Math.max(max, item.order), 0);
  const record = {
    id: crypto.randomUUID(),
    ...parsed.data,
    createdAt: new Date().toISOString(),
    order: maxOrder + 1
  };
  library.push(record);
  saveLibrary(library);
  return NextResponse.json({ ok: true, record });
}

export async function PATCH(request: Request) {
  if (!isAdminSession()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const library = getLibrary();
  const index = library.findIndex((item) => item.id === parsed.data.id);
  if (index === -1) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  library[index] = { ...library[index], ...parsed.data };
  saveLibrary(library);
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  if (!isAdminSession()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const library = getLibrary();
  const orderMap = new Map(parsed.data.orderedIds.map((id, index) => [id, index + 1]));
  const reordered = library.map((item) => ({
    ...item,
    order: orderMap.get(item.id) ?? item.order
  }));
  saveLibrary(reordered);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!isAdminSession()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const library = getLibrary().filter((item) => item.id !== parsed.data.id);
  saveLibrary(library);
  return NextResponse.json({ ok: true });
}
