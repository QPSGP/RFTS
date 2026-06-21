import type Stripe from "stripe";
import { normalizeAffiliateCode } from "@/lib/affiliate-code";
import {
  calculateAffiliateCommissionCents,
  didCrossPayoutThreshold,
  getCurrentAffiliatePayoutThresholdUsd
} from "@/lib/affiliate-payout";
import { trySendAffiliateThresholdReachedEmail } from "@/lib/affiliate-notifications";
import {
  getAffiliateCommissionByInvoiceId,
  getAffiliatePendingBalanceCents,
  getUserIdByStripeCustomerId,
  getUserIdByStripeSubscriptionId,
  getUserReferralAttribution,
  insertAffiliateCommission,
  resolveAffiliateOwnerByCode
} from "@/lib/db";

export type RecordCommissionResult = {
  recorded: boolean;
  reason?: string;
};

export async function recordAffiliateCommissionFromInvoice(
  invoice: Stripe.Invoice,
  stripeEventId?: string
): Promise<RecordCommissionResult> {
  if (invoice.status !== "paid") {
    return { recorded: false, reason: "not_paid" };
  }

  const amountPaid = invoice.amount_paid ?? 0;
  if (amountPaid <= 0) {
    return { recorded: false, reason: "zero_amount" };
  }

  const invoiceId = invoice.id;
  if (!invoiceId) {
    return { recorded: false, reason: "no_invoice_id" };
  }

  const existing = await getAffiliateCommissionByInvoiceId(invoiceId);
  if (existing) {
    return { recorded: false, reason: "already_recorded" };
  }

  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id ?? null;
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;

  let referredUserId: string | null = null;
  if (subscriptionId) {
    referredUserId = await getUserIdByStripeSubscriptionId(subscriptionId);
  }
  if (!referredUserId && customerId) {
    referredUserId = await getUserIdByStripeCustomerId(customerId);
  }
  if (!referredUserId) {
    return { recorded: false, reason: "no_user" };
  }

  const attribution = await getUserReferralAttribution(referredUserId);
  if (!attribution) {
    return { recorded: false, reason: "no_user" };
  }

  const affiliateCode = normalizeAffiliateCode(attribution.referredByAffiliateCode);
  if (!affiliateCode) {
    return { recorded: false, reason: "no_referral" };
  }

  const ownCode = normalizeAffiliateCode(attribution.affiliateCode);
  if (ownCode && ownCode === affiliateCode) {
    return { recorded: false, reason: "self_referral" };
  }

  const affiliateOwner = await resolveAffiliateOwnerByCode(affiliateCode);
  if (affiliateOwner?.userId && affiliateOwner.userId === referredUserId) {
    return { recorded: false, reason: "self_referral" };
  }

  const commissionCents = calculateAffiliateCommissionCents(amountPaid);
  if (commissionCents <= 0) {
    return { recorded: false, reason: "zero_commission" };
  }

  const currency = (invoice.currency || "usd").toLowerCase();

  const thresholdCents = getCurrentAffiliatePayoutThresholdUsd() * 100;
  const balanceBeforeCents = await getAffiliatePendingBalanceCents(affiliateCode);

  await insertAffiliateCommission({
    affiliateCode,
    affiliateUserId: affiliateOwner?.userId ?? null,
    referredUserId,
    stripeInvoiceId: invoiceId,
    stripeEventId: stripeEventId ?? null,
    grossAmountCents: amountPaid,
    commissionAmountCents: commissionCents,
    currency
  });

  if (affiliateOwner?.email) {
    const balanceAfterCents = await getAffiliatePendingBalanceCents(affiliateCode);
    if (didCrossPayoutThreshold(balanceBeforeCents, balanceAfterCents, thresholdCents)) {
      await trySendAffiliateThresholdReachedEmail({
        affiliateCode,
        affiliateEmail: affiliateOwner.email,
        affiliateUserId: affiliateOwner.userId,
        balanceCents: balanceAfterCents,
        thresholdUsd: thresholdCents / 100
      });
    }
  }

  return { recorded: true };
}
