import type Stripe from "stripe";
import {
  ensureSubscription,
  getSubscriptionStripeIdsForUser,
  getUserByEmail,
  getUserProfile,
  listSubscriptionPlans
} from "@/lib/db";
import { createBillingPortalSessionUrl } from "@/lib/stripe-billing-portal";
import { getBillingPortalReturnPath, isStripeBillingConfigured } from "@/lib/member-billing";
import { createMembershipCheckoutSession } from "@/lib/stripe-checkout";
import { getPublicSiteUrl } from "@/lib/site-url";

export type AdminMemberPaymentLinkResult =
  | { ok: true; url: string; tier: "platinum" | "platinum_managed"; planName: string }
  | { ok: true; url: string; billingPortal: true }
  | { ok: false; status: number; error: string };

export async function createAdminMemberPaymentLink(opts: {
  stripe: Stripe;
  email: string;
  tier?: "platinum" | "platinum_managed";
}): Promise<AdminMemberPaymentLinkResult> {
  if (!isStripeBillingConfigured()) {
    return { ok: false, status: 503, error: "Stripe is not configured for live billing." };
  }

  const user = await getUserByEmail(opts.email);
  if (!user) {
    return { ok: false, status: 404, error: "Member not found." };
  }

  const profile = await getUserProfile(opts.email);
  const tier = opts.tier ?? profile?.subscriptionTier ?? "platinum_managed";
  if (tier !== "platinum" && tier !== "platinum_managed") {
    return { ok: false, status: 400, error: "Invalid membership tier." };
  }

  const stripeRow = await getSubscriptionStripeIdsForUser(user.id);
  const hasExistingStripe =
    !!(stripeRow?.stripeSubscriptionId?.trim() || stripeRow?.stripeCustomerId?.trim());
  const baseUrl = getPublicSiteUrl();

  if (hasExistingStripe) {
    try {
      const portalUrl = await createBillingPortalSessionUrl(opts.stripe, {
        stripeCustomerId: stripeRow?.stripeCustomerId,
        stripeSubscriptionId: stripeRow?.stripeSubscriptionId,
        baseUrl,
        returnPath: getBillingPortalReturnPath(user.email)
      });
      if (portalUrl) {
        return { ok: true, url: portalUrl, billingPortal: true };
      }
    } catch (e) {
      console.error("[admin-member-checkout] Billing portal:", e);
    }
    return {
      ok: false,
      status: 409,
      error:
        "This member already has Stripe billing on file. Use Manage billing or paste Stripe IDs — do not create a second subscription."
    };
  }

  const plans = await listSubscriptionPlans();
  const plan = plans.find((item) => item.id === tier);
  if (!plan?.priceId?.trim()) {
    return {
      ok: false,
      status: 400,
      error: `Stripe Price ID is not configured for ${plan?.name ?? tier}. Set it in Admin → Subscription Plans.`
    };
  }

  const currentStatus = profile?.subscriptionStatus ?? "inactive";
  await ensureSubscription(user.id, tier, currentStatus === "active" ? "active" : "inactive");

  const session = await createMembershipCheckoutSession(opts.stripe, {
    mode: "subscription",
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: { tier: plan.id },
    line_items: [{ price: plan.priceId, quantity: 1 }],
    subscription_data:
      plan.trialDays && plan.trialDays > 0
        ? { trial_period_days: plan.trialDays }
        : undefined,
    success_url: `${baseUrl}/play-options`,
    cancel_url: `${baseUrl}/member/login`,
    allow_promotion_codes: true
  });

  if (!session.url) {
    return { ok: false, status: 500, error: "Stripe Checkout did not return a URL." };
  }

  return {
    ok: true,
    url: session.url,
    tier,
    planName: plan.name
  };
}
