import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail } from "@/lib/auth";
import { createAdminMemberPaymentLink } from "@/lib/admin-member-checkout";
import { requireModeratorAssignedMember } from "@/lib/moderator-member-access";
import { getStripe } from "@/lib/stripe";

const schema = z.object({
  email: z.string().email(),
  tier: z.enum(["platinum", "platinum_managed"]).optional(),
  cancelReturnPath: z.string().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const access = await requireModeratorAssignedMember(parsed.data.email);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
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
    email: access.memberEmail,
    tier: parsed.data.tier,
    cancelReturnPath: parsed.data.cancelReturnPath,
    adminEmail: getSessionEmail(),
    billingConsole: "moderator"
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if ("billingPortal" in result && result.billingPortal) {
    return NextResponse.json({
      url: result.url,
      billingPortal: true,
      message: "Member already has Stripe billing. Open billing portal to manage subscription."
    });
  }

  if ("planName" in result) {
    return NextResponse.json({
      url: result.url,
      tier: result.tier,
      planName: result.planName
    });
  }

  return NextResponse.json({ error: "Unexpected checkout response." }, { status: 500 });
}
