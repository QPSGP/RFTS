import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import {
  createLibraryItem,
  deleteLibraryItem,
  getLibraryItemIdBySkuCode,
  listLibrary,
  reorderLibraryItems,
  updateLibraryItem
} from "@/lib/db";

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  skuCode: z.string().optional().default(""),
  fileName: z.string().optional().default(""),
  categories: z.array(z.string()).optional().default([]),
  coverUrl: z.string().optional().default(""),
  audioUrl: z.string().optional().default(""),
  interestIds: z.array(z.string()).default([]),
  allowedUserEmails: z.array(z.string().email()).optional().default([]),
  isAdult: z.boolean().optional()
});

const updateSchema = z.object({
  id: z.string(),
  title: z.string().min(2),
  description: z.string().min(2),
  skuCode: z.string().optional().default(""),
  fileName: z.string().optional().default(""),
  categories: z.array(z.string()).optional().default([]),
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
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ library: await listLibrary() });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors?.[0] || parsed.error.errors?.[0]?.message || "Invalid input.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const sku = (parsed.data.skuCode || "").trim();
  if (sku) {
    const existingId = await getLibraryItemIdBySkuCode(sku);
    if (existingId) {
      return NextResponse.json(
        { error: "A library item with this SKU already exists." },
        { status: 409 }
      );
    }
  }
  const record = await createLibraryItem({
    title: parsed.data.title,
    description: parsed.data.description,
    skuCode: parsed.data.skuCode,
    fileName: parsed.data.fileName,
    categories: parsed.data.categories,
    coverUrl: parsed.data.coverUrl,
    audioUrl: parsed.data.audioUrl,
    interestIds: parsed.data.interestIds,
    allowedUserEmails: parsed.data.allowedUserEmails,
    isAdult: parsed.data.isAdult
  });
  return NextResponse.json({ ok: true, record });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors?.[0] || parsed.error.errors?.[0]?.message || "Invalid input.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const sku = (parsed.data.skuCode || "").trim();
  if (sku) {
    const existingId = await getLibraryItemIdBySkuCode(sku, parsed.data.id);
    if (existingId) {
      return NextResponse.json(
        { error: "A library item with this SKU already exists." },
        { status: 409 }
      );
    }
  }
  const record = await updateLibraryItem({
    id: parsed.data.id,
    title: parsed.data.title,
    description: parsed.data.description,
    skuCode: parsed.data.skuCode,
    fileName: parsed.data.fileName,
    categories: parsed.data.categories,
    coverUrl: parsed.data.coverUrl,
    audioUrl: parsed.data.audioUrl,
    interestIds: parsed.data.interestIds,
    allowedUserEmails: parsed.data.allowedUserEmails,
    order: parsed.data.order,
    isAdult: parsed.data.isAdult
  });
  if (!record) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  await reorderLibraryItems(parsed.data.orderedIds);
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
  await deleteLibraryItem(parsed.data.id);
  return NextResponse.json({ ok: true });
}
