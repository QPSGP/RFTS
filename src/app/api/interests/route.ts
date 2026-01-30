import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail } from "@/lib/auth";
import { getInterests, saveInterests } from "@/lib/storage";

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional()
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  description: z.string().optional()
});

const deleteSchema = z.object({
  id: z.string()
});

export async function GET() {
  const sessionEmail = getSessionEmail();
  if (!sessionEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ interests: getInterests() });
}

export async function POST(request: Request) {
  const sessionEmail = getSessionEmail();
  if (!sessionEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const interests = getInterests();
  const record = {
    id: crypto.randomUUID(),
    name: parsed.data.name,
    description: parsed.data.description || "",
    createdAt: new Date().toISOString()
  };
  interests.unshift(record);
  saveInterests(interests);
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
  const interests = getInterests();
  const index = interests.findIndex((item) => item.id === parsed.data.id);
  if (index === -1) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  interests[index] = {
    ...interests[index],
    name: parsed.data.name,
    description: parsed.data.description || ""
  };
  saveInterests(interests);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const sessionEmail = getSessionEmail();
  if (!sessionEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const interests = getInterests().filter((item) => item.id !== parsed.data.id);
  saveInterests(interests);
  return NextResponse.json({ ok: true });
}
