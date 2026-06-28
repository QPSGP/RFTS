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
import { createAdminBillingReturnToken } from "@/lib/auth";
import { getPublicSiteUrl } from "@/lib/site-url";

export type StaffBillingConsole = "admin" | "moderator";

function normalizeStaffCancelReturnPath(
  path: string | undefined,
  console: StaffBillingConsole
): string {
  const prefix = console === "admin" ? "/admin" : "/moderator";
  const fallback = console === "admin" ? "/admin/content" : "/moderator/console";
  const raw = (path || fallback).trim();
  if (!raw) return fallback;
  const pathname = raw.startsWith("/") ? raw.split("?")[0]?.split("#")[0] ?? fallback : fallback;
  if (!pathname.startsWith(prefix) || pathname.startsWith("//")) return fallback;
  return pathname;
}

function staffBillingReturnBasePath(console: StaffBillingConsole): string {
  return console === "admin" ? "/admin/billing-return" : "/moderator/billing-return";
}

function buildStaffStripeReturnUrl(
  baseUrl: string,
  staffEmail: string,
  console: StaffBillingConsole,
  nextPath: string,
  billing?: "cancel"
): string {
  const token = createAdminBillingReturnToken(staffEmail);
  const normalizedNext = normalizeStaffCancelReturnPath(nextPath, console);
  const nextWithQuery = billing ? `${normalizedNext}?billing=${billing}` : normalizedNext;
  const url = new URL(staffBillingReturnBasePath(console), baseUrl);
  url.searchParams.set("t", token);
  url.searchParams.set("next", nextWithQuery);
  return url.toString();
}

export type AdminMemberPaymentLinkResult =
  | { ok: true; url: string; tier: "platinum" | "platinum_managed"; planName: string }
  | { ok: true; url: string; billingPortal: true }
  | { ok: false; status: number; error: string };

export async function createAdminMemberPaymentLink(opts: {
  stripe: Stripe;
  email: string;
  tier?: "platinum" | "platinum_managed";
  /** Where Stripe sends the staff user if they abandon Checkout. */
  cancelReturnPath?: string;
  /** Staff who opened the link — used to restore session after Stripe redirect. */
  adminEmail?: string | null;
  /** Facilitator console uses /moderator paths and billing-return. */
  billingConsole?: StaffBillingConsole;
}): Promise<AdminMemberPaymentLinkResult> {
  const billingConsole = opts.billingConsole ?? "admin";
  const staffEmail = opts.adminEmail?.trim() || null;

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
      const portalReturnPath = staffEmail
        ? (() => {
            const returnUrl = buildStaffStripeReturnUrl(
              baseUrl,
              staffEmail,
              billingConsole,
              normalizeStaffCancelReturnPath(opts.cancelReturnPath, billingConsole)
            );
            const parsed = new URL(returnUrl);
            return `${parsed.pathname}${parsed.search}`;
          })()
        : getBillingPortalReturnPath(user.email);
      const portalUrl = await createBillingPortalSessionUrl(opts.stripe, {
        stripeCustomerId: stripeRow?.stripeCustomerId,
        stripeSubscriptionId: stripeRow?.stripeSubscriptionId,
        baseUrl,
        returnPath: portalReturnPath
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
        "This member already has Stripe billing on file. Use Manage billing — do not create a second subscription."
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

  const cancelPath = normalizeStaffCancelReturnPath(opts.cancelReturnPath, billingConsole);
  const successReturnPath = getBillingPortalReturnPath(user.email);
  const cancelUrl = staffEmail
    ? buildStaffStripeReturnUrl(baseUrl, staffEmail, billingConsole, cancelPath, "cancel")
    : `${baseUrl}${cancelPath}?billing=cancel`;

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
    success_url: `${baseUrl}${successReturnPath}`,
    cancel_url: cancelUrl,
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
