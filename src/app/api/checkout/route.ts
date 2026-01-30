import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";

const schema = z.object({
  priceId: z.string().min(4),
  trialDays: z.number().int().min(0).max(365).optional(),
  successPath: z.string().default("/"),
  cancelPath: z.string().default("/")
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { priceId, trialDays, successPath, cancelPath } = parsed.data;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data:
      trialDays && trialDays > 0 ? { trial_period_days: trialDays } : undefined,
    success_url: `${baseUrl}${successPath}`,
    cancel_url: `${baseUrl}${cancelPath}`,
    allow_promotion_codes: true
  });

  return NextResponse.json({ url: session.url });
}
