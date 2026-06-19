import type Stripe from "stripe";

export type ResolvedStripeBilling = {
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Find a Stripe customer (and subscription when present) by login email.
 * Used when Checkout completed but webhook did not persist IDs, or for admin-migrated members.
 */
export async function resolveStripeBillingByEmail(
  stripe: Stripe,
  email: string
): Promise<ResolvedStripeBilling | null> {
  const normalized = email.trim();
  if (!normalized) return null;

  const customers = await stripe.customers.list({ email: normalized, limit: 10 });
  if (!customers.data.length) return null;

  let fallback: ResolvedStripeBilling | null = null;

  for (const customer of customers.data) {
    const customerId = customer.id;
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20
    });

    const activeSub = subs.data.find((sub) => ACTIVE_SUBSCRIPTION_STATUSES.has(sub.status));
    if (activeSub) {
      return { stripeCustomerId: customerId, stripeSubscriptionId: activeSub.id };
    }

    if (subs.data[0]) {
      if (!fallback) {
        fallback = { stripeCustomerId: customerId, stripeSubscriptionId: subs.data[0].id };
      }
      continue;
    }

    if (!fallback) {
      fallback = { stripeCustomerId: customerId, stripeSubscriptionId: null };
    }
  }

  return fallback;
}
