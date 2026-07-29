import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import {
  createOutreachActivity,
  createOutreachContact,
  deleteOutreachContact,
  getOutreachTarget,
  listOutreachContacts,
  updateOutreachContact
} from "@/lib/db";

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .nullish()
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email");

const createSchema = z.object({
  targetId: z.string().uuid(),
  name: z.string().trim().max(120).nullish(),
  email: optionalEmail,
  phone: z.string().trim().max(60).nullish(),
  roleTitle: z.string().trim().max(120).nullish(),
  preferredTimes: z.string().trim().max(200).nullish(),
  isPrimary: z.boolean().nullish()
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().max(120).nullish(),
  email: optionalEmail,
  phone: z.string().trim().max(60).nullish(),
  roleTitle: z.string().trim().max(120).nullish(),
  preferredTimes: z.string().trim().max(200).nullish(),
  isPrimary: z.boolean().nullish()
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
  const contacts = await listOutreachContacts(targetId);
  return NextResponse.json({ contacts });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const target = await getOutreachTarget(parsed.data.targetId);
  if (!target) {
    return NextResponse.json({ error: "Target not found." }, { status: 404 });
  }
  const email =
    parsed.data.email && parsed.data.email.trim() ? parsed.data.email.trim() : null;
  const contact = await createOutreachContact({
    ...parsed.data,
    email
  });
  await createOutreachActivity({
    targetId: parsed.data.targetId,
    contactId: contact.id,
    kind: "contact_added",
    subject: contact.name || contact.email || "Contact added",
    createdByEmail: getSessionEmail()
  });
  return NextResponse.json({ ok: true, contact });
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
  const email =
    rest.email !== undefined
      ? rest.email && rest.email.trim()
        ? rest.email.trim()
        : null
      : undefined;
  const contact = await updateOutreachContact(id, { ...rest, email });
  if (!contact) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, contact });
}

export async function DELETE(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }
  const ok = await deleteOutreachContact(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
