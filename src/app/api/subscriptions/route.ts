import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireAdmin } from "@/lib/api-utils";
import { listSubscriptionPlans, saveSubscriptionPlans } from "@/lib/db";

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
  return NextResponse.json({ plans: await listSubscriptionPlans() });
}

/** PUT or POST: update plans (admin only). POST is accepted for form compatibility. */
export async function PUT(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid input.", 400);
  }
  await saveSubscriptionPlans(parsed.data.plans);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  return PUT(request);
}
