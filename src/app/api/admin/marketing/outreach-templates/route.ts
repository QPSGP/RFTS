import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import {
  createOutreachEmailTemplate,
  deleteOutreachEmailTemplate,
  listOutreachEmailTemplates,
  seedOutreachEmailTemplates,
  updateOutreachEmailTemplate
} from "@/lib/db";

const templateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(300),
  bodyText: z.string().trim().min(1).max(20000),
  purpose: z.string().trim().max(80).nullish()
});

const updateSchema = templateSchema.extend({
  id: z.string().uuid()
});

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const templates = await listOutreachEmailTemplates();
  const res = NextResponse.json({ templates });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  if (body?.seed === true) {
    const added = await seedOutreachEmailTemplates();
    const templates = await listOutreachEmailTemplates();
    return NextResponse.json({ ok: true, added, templates });
  }
  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const template = await createOutreachEmailTemplate({
    name: parsed.data.name,
    subject: parsed.data.subject,
    bodyText: parsed.data.bodyText,
    purpose: parsed.data.purpose ?? null
  });
  return NextResponse.json({ ok: true, template });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { id, ...rest } = parsed.data;
  const template = await updateOutreachEmailTemplate(id, {
    name: rest.name,
    subject: rest.subject,
    bodyText: rest.bodyText,
    purpose: rest.purpose ?? null
  });
  if (!template) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, template });
}

export async function DELETE(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  let id = url.searchParams.get("id") || "";
  if (!id) {
    const body = await request.json().catch(() => ({}));
    id = typeof body?.id === "string" ? body.id : "";
  }
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }
  const ok = await deleteOutreachEmailTemplate(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
