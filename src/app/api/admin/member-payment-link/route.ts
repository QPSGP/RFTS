import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminMemberPaymentLink } from "@/lib/admin-member-checkout";
import { isAdminSession } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

const schema = z.object({
  email: z.string().email(),
  tier: z.enum(["platinum", "platinum_managed"]).optional()
});

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe unavailable." },
      { status: 500 }
    );
  }

  const result = await createAdminMemberPaymentLink({
    stripe,
    email: parsed.data.email,
    tier: parsed.data.tier
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if ("billingPortal" in result && result.billingPortal) {
    return NextResponse.json({
      url: result.url,
      billingPortal: true,
      message: "Member already has Stripe billing. Open billing portal instead of Checkout."
    });
  }

  return NextResponse.json({
    url: result.url,
    tier: result.tier,
    planName: result.planName
  });
}
