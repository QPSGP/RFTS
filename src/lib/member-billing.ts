import type Stripe from "stripe";
import {
  getSubscriptionStripeIdsForUser,
  listSubscriptionPlans,
  updateSubscriptionStripeIdsForUser
} from "@/lib/db";
import { createBillingPortalSessionUrl } from "@/lib/stripe-billing-portal";
import { resolveStripeBillingByEmail } from "@/lib/stripe-resolve";
import { getStripe } from "@/lib/stripe";
import { stripeCheckoutPaymentMethodParams } from "@/lib/stripe-checkout";
import { getPublicSiteUrl } from "@/lib/site-url";
import { createBillingReturnToken } from "@/lib/user-auth";

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

export function getBillingPortalReturnPath(userEmail: string | null | undefined): string {
  const email = userEmail?.trim();
  if (!email) return "/play-options";
  const token = createBillingReturnToken(email);
  return `/member/billing-return?t=${encodeURIComponent(token)}`;
}

function billingPortalReturnPath(userEmail: string | null | undefined): string {
  return getBillingPortalReturnPath(userEmail);
}

async function openBillingPortalForStripeIds(
  stripe: Stripe,
  opts: {
    userId: string;
    stripeCustomerId: string | null | undefined;
    stripeSubscriptionId: string | null | undefined;
    baseUrl: string;
    returnPath: string;
    persistIds?: boolean;
  }
): Promise<MemberBillingPortalResult | null> {
  const customerId = opts.stripeCustomerId?.trim() || null;
  const subscriptionId = opts.stripeSubscriptionId?.trim() || null;
  if (!customerId && !subscriptionId) return null;

  if (opts.persistIds && customerId) {
    try {
      await updateSubscriptionStripeIdsForUser(opts.userId, customerId, subscriptionId);
    } catch (err) {
      console.error("[member-billing] Failed to persist Stripe ids:", err);
    }
  }

  try {
    const portalUrl = await createBillingPortalSessionUrl(stripe, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      baseUrl: opts.baseUrl,
      returnPath: opts.returnPath
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

export async function createMemberBillingPortalUrl(opts: {
  userId: string;
  userEmail?: string | null;
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
  const returnPath = billingPortalReturnPath(opts.userEmail);

  const stripeRow = await getSubscriptionStripeIdsForUser(opts.userId);
  const hasExistingStripe = !!(
    stripeRow?.stripeSubscriptionId?.trim() || stripeRow?.stripeCustomerId?.trim()
  );

  if (hasExistingStripe) {
    const portalResult = await openBillingPortalForStripeIds(stripe, {
      userId: opts.userId,
      stripeCustomerId: stripeRow?.stripeCustomerId,
      stripeSubscriptionId: stripeRow?.stripeSubscriptionId,
      baseUrl,
      returnPath
    });
    if (portalResult) return portalResult;
  }

  const email = opts.userEmail?.trim();
  if (email) {
    try {
      const resolved = await resolveStripeBillingByEmail(stripe, email);
      if (resolved) {
        const portalResult = await openBillingPortalForStripeIds(stripe, {
          userId: opts.userId,
          stripeCustomerId: resolved.stripeCustomerId,
          stripeSubscriptionId: resolved.stripeSubscriptionId,
          baseUrl,
          returnPath,
          persistIds: true
        });
        if (portalResult) return portalResult;
      }
    } catch (err) {
      console.error("[member-billing] Stripe email resolve:", err);
    }
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
    const checkoutReturnPath = normalizeReturnPath(opts.returnPath);
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        ...stripeCheckoutPaymentMethodParams(),
        client_reference_id: opts.userId,
        metadata: { tier: plan.id },
        line_items: [{ price: plan.priceId, quantity: 1 }],
        subscription_data:
          plan.trialDays && plan.trialDays > 0
            ? { trial_period_days: plan.trialDays }
            : undefined,
        success_url: `${baseUrl}${checkoutReturnPath}?billing=success`,
        cancel_url: `${baseUrl}${checkoutReturnPath}?billing=cancel`,
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
    error:
      "We could not find Stripe billing for this account. Contact support at reachforthestars.today if you pay through Stripe."
  };
}
