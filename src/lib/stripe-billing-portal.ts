import type Stripe from "stripe";

/**
 * Opens Stripe Customer Billing Portal when we already have a Stripe relationship
 * (avoids starting a second Checkout subscription for the same member).
 * Requires Billing Portal to be configured in the Stripe Dashboard.
 */
export async function createBillingPortalSessionUrl(
  stripe: Stripe,
  opts: {
    stripeCustomerId: string | null | undefined;
    stripeSubscriptionId: string | null | undefined;
    baseUrl: string;
    returnPath?: string;
  }
): Promise<string | null> {
  let customerId = opts.stripeCustomerId?.trim() || null;
  const subId = opts.stripeSubscriptionId?.trim() || null;

  if (!customerId && subId) {
    const sub = await stripe.subscriptions.retrieve(subId);
    const c = sub.customer;
    if (typeof c === "string") {
      customerId = c;
    } else if (c && typeof c === "object" && "deleted" in c && (c as Stripe.DeletedCustomer).deleted) {
      customerId = null;
    } else if (c && typeof c === "object" && "id" in c) {
      customerId = (c as Stripe.Customer).id;
    }
  }

  if (!customerId) {
    return null;
  }

  const base = opts.baseUrl.replace(/\/$/, "");
  const path = (opts.returnPath || "/play-options").startsWith("/")
    ? opts.returnPath || "/play-options"
    : `/${opts.returnPath || "play-options"}`;
  const returnUrl = `${base}${path}`;

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  });
  return portal.url;
}
