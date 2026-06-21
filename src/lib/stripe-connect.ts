import type Stripe from "stripe";
import { getCurrentAffiliatePayoutThresholdUsd } from "@/lib/affiliate-payout";
import {
  getAffiliatePendingBalanceCents,
  getUserByAffiliateCode,
  getUserStripeConnectFields,
  listAffiliateCodesAbovePayoutThreshold,
  markAffiliateCommissionsPaid,
  resolveAffiliateOwnerByCode,
  setUserStripeConnectAccount,
  syncUserStripeConnectFromStripeAccount
} from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getPublicSiteUrl } from "@/lib/site-url";

export type StripeConnectStatus = {
  accountId: string | null;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  transfersActive: boolean;
  readyForTransfers: boolean;
};

export function parseStripeConnectStatus(account: Stripe.Account | null): StripeConnectStatus {
  if (!account) {
    return {
      accountId: null,
      detailsSubmitted: false,
      payoutsEnabled: false,
      transfersActive: false,
      readyForTransfers: false
    };
  }
  const transfersActive = account.capabilities?.transfers === "active";
  const detailsSubmitted = account.details_submitted ?? false;
  const payoutsEnabled = account.payouts_enabled ?? false;
  return {
    accountId: account.id,
    detailsSubmitted,
    payoutsEnabled,
    transfersActive,
    readyForTransfers: transfersActive && detailsSubmitted && payoutsEnabled
  };
}

export async function refreshStripeConnectStatusFromStripe(
  stripe: Stripe,
  userId: string,
  accountId: string
): Promise<StripeConnectStatus> {
  const account = await stripe.accounts.retrieve(accountId);
  await syncUserStripeConnectFromStripeAccount(account, userId);
  return parseStripeConnectStatus(account);
}

export async function createExpressConnectAccount(
  stripe: Stripe,
  userId: string,
  email: string
): Promise<string> {
  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email,
    metadata: { rfts_user_id: userId },
    capabilities: {
      transfers: { requested: true }
    },
    business_type: "individual"
  });
  await setUserStripeConnectAccount(userId, account.id, {
    detailsSubmitted: account.details_submitted ?? false,
    payoutsEnabled: account.payouts_enabled ?? false
  });
  return account.id;
}

export async function createConnectOnboardingLink(
  stripe: Stripe,
  accountId: string,
  returnPath = "/member/profile"
): Promise<string> {
  const baseUrl = getPublicSiteUrl();
  const returnUrl = `${baseUrl}${returnPath}?connect=return`;
  const refreshUrl = `${baseUrl}${returnPath}?connect=refresh`;
  const account = await stripe.accounts.retrieve(accountId);
  const linkType = account.details_submitted ? "account_update" : "account_onboarding";
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: linkType
  });
  return link.url;
}

export type ConnectPayoutResult = {
  ok: boolean;
  affiliateCode: string;
  transferId?: string;
  amountCents?: number;
  markedCount?: number;
  error?: string;
};

export async function runStripeConnectPayoutForAffiliate(
  affiliateCode: string
): Promise<ConnectPayoutResult> {
  const code = affiliateCode.trim().toUpperCase();
  const pendingBalanceCents = await getAffiliatePendingBalanceCents(code);
  const thresholdCents = getCurrentAffiliatePayoutThresholdUsd() * 100;
  if (pendingBalanceCents < thresholdCents) {
    return {
      ok: false,
      affiliateCode: code,
      error: `Balance ${pendingBalanceCents} cents is below ${thresholdCents} cents threshold.`
    };
  }
  if (pendingBalanceCents < 100) {
    return { ok: false, affiliateCode: code, error: "Minimum Stripe transfer is $1.00." };
  }

  const user = await getUserByAffiliateCode(code);
  if (!user) {
    return { ok: false, affiliateCode: code, error: "Affiliate user not found." };
  }
  const connect = await getUserStripeConnectFields(user.id);
  if (!connect?.stripeConnectAccountId) {
    return {
      ok: false,
      affiliateCode: code,
      error: "Affiliate has not completed Stripe Connect onboarding."
    };
  }

  const stripe = getStripe();
  const status = await refreshStripeConnectStatusFromStripe(
    stripe,
    user.id,
    connect.stripeConnectAccountId
  );
  if (!status.readyForTransfers) {
    return {
      ok: false,
      affiliateCode: code,
      error: "Stripe Connect account is not ready to receive transfers yet."
    };
  }

  try {
    const transfer = await stripe.transfers.create({
      amount: pendingBalanceCents,
      currency: "usd",
      destination: connect.stripeConnectAccountId,
      description: `RFTS affiliate commission ${code}`,
      metadata: { affiliate_code: code, rfts_user_id: user.id }
    });
    const markedCount = await markAffiliateCommissionsPaid(
      code,
      `stripe_connect_transfer:${transfer.id}`
    );
    const owner = await resolveAffiliateOwnerByCode(code);
    if (owner?.email) {
      const { trySendAffiliatePayoutSentEmail } = await import("@/lib/affiliate-notifications");
      await trySendAffiliatePayoutSentEmail({
        affiliateCode: code,
        affiliateEmail: owner.email,
        affiliateUserId: owner.userId,
        amountCents: pendingBalanceCents,
        transferId: transfer.id
      });
    }
    return {
      ok: true,
      affiliateCode: code,
      transferId: transfer.id,
      amountCents: pendingBalanceCents,
      markedCount
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, affiliateCode: code, error: message };
  }
}

export async function runAllReadyStripeConnectPayouts(): Promise<ConnectPayoutResult[]> {
  const thresholdCents = getCurrentAffiliatePayoutThresholdUsd() * 100;
  const codes = await listAffiliateCodesAbovePayoutThreshold(thresholdCents);
  const results: ConnectPayoutResult[] = [];

  for (const affiliateCode of codes) {
    const user = await getUserByAffiliateCode(affiliateCode);
    if (!user) continue;
    const connect = await getUserStripeConnectFields(user.id);
    if (!connect?.stripeConnectAccountId || !connect.stripeConnectDetailsSubmitted) continue;
    results.push(await runStripeConnectPayoutForAffiliate(affiliateCode));
  }
  return results;
}

export async function getMemberStripeConnectStatus(userId: string): Promise<StripeConnectStatus> {
  const fields = await getUserStripeConnectFields(userId);
  if (!fields?.stripeConnectAccountId) {
    return parseStripeConnectStatus(null);
  }
  const stripe = getStripe();
  return refreshStripeConnectStatusFromStripe(stripe, userId, fields.stripeConnectAccountId);
}
