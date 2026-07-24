import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  LGD_DEFAULT_PRICE_CENTS,
  LGD_STRIPE_PRODUCT_ID,
  getLgdPriceDisplay
} from "@/lib/lgd-access";
import { createMembershipCheckoutSession } from "@/lib/stripe-checkout";

/** Resolve an active Stripe Price for the LGD product, or build price_data at $397. */
export async function resolveLgdCheckoutLineItem(): Promise<
  Stripe.Checkout.SessionCreateParams.LineItem
> {
  const stripe = getStripe();
  const envPriceId = process.env.STRIPE_LGD_PRICE_ID?.trim();
  if (envPriceId) {
    return { price: envPriceId, quantity: 1 };
  }
  try {
    const prices = await stripe.prices.list({
      product: LGD_STRIPE_PRODUCT_ID,
      active: true,
      limit: 5
    });
    const preferred =
      prices.data.find((p) => p.unit_amount === LGD_DEFAULT_PRICE_CENTS) || prices.data[0];
    if (preferred?.id) {
      return { price: preferred.id, quantity: 1 };
    }
  } catch (e) {
    console.warn("[lgd-stripe] Could not list product prices:", e);
  }
  const { priceCents } = getLgdPriceDisplay();
  return {
    quantity: 1,
    price_data: {
      currency: "usd",
      product: LGD_STRIPE_PRODUCT_ID,
      unit_amount: priceCents ?? LGD_DEFAULT_PRICE_CENTS
    }
  };
}

export async function createLgdCheckoutSession(input: {
  userId: string;
  memberEmail: string;
  intakeId: string;
  baseUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const lineItem = await resolveLgdCheckoutLineItem();
  const { priceCents } = getLgdPriceDisplay();
  return createMembershipCheckoutSession(stripe, {
    mode: "payment",
    customer_email: input.memberEmail,
    client_reference_id: input.userId,
    line_items: [lineItem],
    success_url: `${input.baseUrl}/member/lgd?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.baseUrl}/member/lgd?paid=0`,
    metadata: {
      purpose: "lgd_goal_manifestation",
      intakeId: input.intakeId,
      priceCents: String(priceCents ?? LGD_DEFAULT_PRICE_CENTS)
    }
  });
}
