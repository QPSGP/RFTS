import type Stripe from "stripe";
import {
  getSubscriptionStripeIdsForUser,
  listSubscriptionPlans
} from "@/lib/db";
import { createBillingPortalSessionUrl } from "@/lib/stripe-billing-portal";
import { getStripe } from "@/lib/stripe";
import { getPublicSiteUrl } from "@/lib/site-url";

export function getSubscriptionTierLabel(tier: string | null | undefined): string {
  if (tier === "platinum_managed") return "Platinum Managed";
  if (tier === "platinum") return "Membership";
  return tier?.trim() || "Membership";
}

export function formatSubscriptionStatus(status: string | null | undefined): string {
  if (!status) return "Unknown";
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  if (status === "past_due") return "Past due";
  if (status === "canceled") return "Canceled";
  return status;
}

export function getStripeBillingBaseUrl(): string {
  return getPublicSiteUrl();
}

export function isStripeBillingConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "sk_test_replace") return false;
  if (process.env.DEMO_SKIP_STRIPE === "true") return false;
  return true;
}

export type MemberBillingSummary = {
  subscriptionStatus: string | null;
  subscriptionTier: string | null;
  planName: string;
  statusLabel: string;
  hasStripeBilling: boolean;
  canManageBilling: boolean;
  needsPayment: boolean;
  stripeConfigured: boolean;
};

export async function getMemberBillingSummary(user: {
  id: string;
  subscriptionStatus: string | null;
  subscriptionTier: string | null;
}): Promise<MemberBillingSummary> {
  const stripeRow = await getSubscriptionStripeIdsForUser(user.id);
  const hasStripeBilling = !!(
    stripeRow?.stripeCustomerId?.trim() || stripeRow?.stripeSubscriptionId?.trim()
  );
  const stripeConfigured = isStripeBillingConfigured();
  const tier = user.subscriptionTier ?? "platinum";
  const plans = await listSubscriptionPlans();
  const plan =
    plans.find((item) => item.id === tier) ?? plans.find((item) => item.id === "platinum");
  const planName = plan?.name ?? getSubscriptionTierLabel(tier);
  const needsPayment =
    stripeConfigured &&
    user.subscriptionStatus !== "active" &&
    !hasStripeBilling &&
    !!(plan?.priceId?.trim());

  return {
    subscriptionStatus: user.subscriptionStatus,
    subscriptionTier: user.subscriptionTier,
    planName,
    statusLabel: formatSubscriptionStatus(user.subscriptionStatus),
    hasStripeBilling,
    canManageBilling: hasStripeBilling && stripeConfigured,
    needsPayment,
    stripeConfigured
  };
}

export type MemberBillingPortalResult =
  | { ok: true; url: string; billingPortal: true }
  | { ok: true; url: string; checkout: true }
  | { ok: false; status: number; error: string };

function normalizeReturnPath(returnPath: string | undefined): string {
  const path = (returnPath || "/member/profile").trim() || "/member/profile";
  return path.startsWith("/") ? path : `/${path}`;
}

export async function createMemberBillingPortalUrl(opts: {
  userId: string;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  returnPath?: string;
}): Promise<MemberBillingPortalResult> {
  if (!isStripeBillingConfigured()) {
    return {
      ok: false,
      status: 503,
      error: "Online billing is not available yet. Contact support if you need help."
    };
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    return {
      ok: false,
      status: 503,
      error: "Online billing is not available yet. Contact support if you need help."
    };
  }

  const baseUrl = getStripeBillingBaseUrl();
  const returnPath = normalizeReturnPath(opts.returnPath);

  const stripeRow = await getSubscriptionStripeIdsForUser(opts.userId);
  const hasExistingStripe = !!(
    stripeRow?.stripeSubscriptionId?.trim() || stripeRow?.stripeCustomerId?.trim()
  );

  if (hasExistingStripe) {
    try {
      const portalUrl = await createBillingPortalSessionUrl(stripe, {
        stripeCustomerId: stripeRow?.stripeCustomerId,
        stripeSubscriptionId: stripeRow?.stripeSubscriptionId,
        baseUrl,
        returnPath
      });
      if (portalUrl) {
        return { ok: true, url: portalUrl, billingPortal: true };
      }
    } catch (err) {
      console.error("[member-billing] Billing portal:", err);
      return {
        ok: false,
        status: 503,
        error: "Could not open billing management. Try again or contact support."
      };
    }
    return {
      ok: false,
      status: 409,
      error:
        "We have billing on file but could not open the portal. Contact support for card updates."
    };
  }

  if (opts.subscriptionStatus !== "active") {
    const tier = opts.subscriptionTier ?? "platinum";
    const plans = await listSubscriptionPlans();
    const plan =
      plans.find((item) => item.id === tier) ??
      plans.find((item) => item.id === "platinum");
    if (!plan?.priceId?.trim()) {
      return {
        ok: false,
        status: 400,
        error: "Payment is not configured for your plan. Contact support."
      };
    }
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        client_reference_id: opts.userId,
        metadata: { tier: plan.id },
        line_items: [{ price: plan.priceId, quantity: 1 }],
        subscription_data:
          plan.trialDays && plan.trialDays > 0
            ? { trial_period_days: plan.trialDays }
            : undefined,
        success_url: `${baseUrl}${returnPath}?billing=success`,
        cancel_url: `${baseUrl}${returnPath}?billing=cancel`,
        allow_promotion_codes: true
      });
      if (!session.url) {
        return { ok: false, status: 503, error: "Could not start checkout. Try again." };
      }
      return { ok: true, url: session.url, checkout: true };
    } catch (err) {
      console.error("[member-billing] Checkout:", err);
      return { ok: false, status: 503, error: "Could not start checkout. Try again." };
    }
  }

  return {
    ok: false,
    status: 400,
    error: "Your membership is active. No card on file is required for your account."
  };
}
