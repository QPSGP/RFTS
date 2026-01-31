import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { getSubscriptionPlans, saveSubscriptionPlans } from "@/lib/storage";

const planSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  priceId: z.string().optional().default(""),
  trialDays: z.number().int().min(0).max(365),
  description: z.string().min(2)
});

const updateSchema = z.object({
  plans: z.array(planSchema)
});

export async function GET() {
  return NextResponse.json({ plans: getSubscriptionPlans() });
}

export async function PUT(request: Request) {
  if (!isAdminSession()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  saveSubscriptionPlans(parsed.data.plans);
  return NextResponse.json({ ok: true });
}
