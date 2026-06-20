import { NextResponse } from "next/server";
import { z } from "zod";
import { getSubscriptionStripeIdsForUser, getUserByEmail } from "@/lib/db";
import { createBillingPortalSessionUrl } from "@/lib/stripe-billing-portal";
import { getBillingPortalReturnPath } from "@/lib/member-billing";
import { getStripe } from "@/lib/stripe";
import { stripeCheckoutPaymentMethodParams } from "@/lib/stripe-checkout";
import { getPublicSiteUrl } from "@/lib/site-url";
import { getUserSessionEmail } from "@/lib/user-auth";

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
  let stripe;
  try {
    stripe = getStripe();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe unavailable." },
      { status: 500 }
    );
  }
  const { priceId, trialDays, successPath, cancelPath } = parsed.data;
  const baseUrl = getPublicSiteUrl();

  const memberEmail = await getUserSessionEmail();
  if (memberEmail) {
    const user = await getUserByEmail(memberEmail);
    if (user) {
      const stripeRow = await getSubscriptionStripeIdsForUser(user.id);
      const hasExistingStripe =
        !!(stripeRow?.stripeSubscriptionId?.trim() || stripeRow?.stripeCustomerId?.trim());
      if (hasExistingStripe) {
        try {
          const portalUrl = await createBillingPortalSessionUrl(stripe, {
            stripeCustomerId: stripeRow?.stripeCustomerId,
            stripeSubscriptionId: stripeRow?.stripeSubscriptionId,
            baseUrl,
            returnPath: getBillingPortalReturnPath(memberEmail)
          });
          if (portalUrl) {
            return NextResponse.json({ url: portalUrl, billingPortal: true });
          }
        } catch (e) {
          console.error("[checkout] Billing portal:", e);
          return NextResponse.json(
            {
              error:
                "Could not open billing management. Try again or contact support if you already have a subscription."
            },
            { status: 503 }
          );
        }
        return NextResponse.json(
          {
            error:
              "This account already has Stripe billing on file. Use Manage billing from your console instead of starting a second checkout."
          },
          { status: 409 }
        );
      }
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ...stripeCheckoutPaymentMethodParams(),
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data:
      trialDays && trialDays > 0 ? { trial_period_days: trialDays } : undefined,
    success_url: `${baseUrl}${successPath}`,
    cancel_url: `${baseUrl}${cancelPath}`,
    allow_promotion_codes: true
  });

  return NextResponse.json({ url: session.url });
}
