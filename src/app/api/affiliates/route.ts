import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { createAffiliate, listAffiliates, updateAffiliateStatus } from "@/lib/db";

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
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const affiliates = await listAffiliates();
  return NextResponse.json({ affiliates });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const record = await createAffiliate(parsed.data);
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
  const record = await updateAffiliateStatus(parsed.data.id, parsed.data.status);
  if (!record) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
