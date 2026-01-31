import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { getAffiliates, saveAffiliates } from "@/lib/storage";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  payoutAddress: z.string().min(6)
});

const updateSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "approved", "paused"])
});

export async function GET() {
  if (!isAdminSession()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const affiliates = getAffiliates();
  return NextResponse.json({ affiliates });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const affiliates = getAffiliates();
  const record = {
    id: crypto.randomUUID(),
    ...parsed.data,
    createdAt: new Date().toISOString(),
    status: "pending" as const
  };
  affiliates.unshift(record);
  saveAffiliates(affiliates);
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
  const affiliates = getAffiliates();
  const index = affiliates.findIndex((item) => item.id === parsed.data.id);
  if (index === -1) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  affiliates[index] = { ...affiliates[index], status: parsed.data.status };
  saveAffiliates(affiliates);
  return NextResponse.json({ ok: true });
}
