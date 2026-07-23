import {
  formatUsdFromCents,
  getAffiliateNotificationCcRecipients,
  getCurrentAffiliatePayoutThresholdUsd
} from "@/lib/affiliate-payout";
import { getMemberProfileByUserId } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  getAffiliatePayoutSentEmailContent,
  getAffiliateThresholdReachedEmailContent
} from "@/lib/email-templates";

async function resolveAffiliateFirstName(affiliateUserId: string | null): Promise<string | null> {
  if (!affiliateUserId) return null;
  const profile = await getMemberProfileByUserId(affiliateUserId);
  return profile?.firstName?.trim() || null;
}

export async function trySendAffiliateThresholdReachedEmail(params: {
  affiliateCode: string;
  affiliateEmail: string;
  affiliateUserId?: string | null;
  balanceCents: number;
  thresholdUsd?: number;
}): Promise<void> {
  const email = params.affiliateEmail.trim();
  if (!email) return;

  const thresholdUsd = params.thresholdUsd ?? getCurrentAffiliatePayoutThresholdUsd();
  const firstName = await resolveAffiliateFirstName(params.affiliateUserId ?? null);
  const tpl = getAffiliateThresholdReachedEmailContent({
    firstName,
    affiliateCode: params.affiliateCode,
    balanceUsd: formatUsdFromCents(params.balanceCents),
    thresholdUsd
  });

  const { ok, error } = await sendEmail({
    to: email,
    cc: await getAffiliateNotificationCcRecipients(),
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text
  });
  if (!ok) {
    console.error("[affiliate-email] Threshold reached email failed:", error);
  }
}

export async function trySendAffiliatePayoutSentEmail(params: {
  affiliateCode: string;
  affiliateEmail: string;
  affiliateUserId?: string | null;
  amountCents: number;
  transferId?: string;
}): Promise<void> {
  const email = params.affiliateEmail.trim();
  if (!email) return;

  const firstName = await resolveAffiliateFirstName(params.affiliateUserId ?? null);
  const tpl = getAffiliatePayoutSentEmailContent({
    firstName,
    affiliateCode: params.affiliateCode,
    amountUsd: formatUsdFromCents(params.amountCents),
    transferId: params.transferId
  });

  const { ok, error } = await sendEmail({
    to: email,
    cc: await getAffiliateNotificationCcRecipients(),
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text
  });
  if (!ok) {
    console.error("[affiliate-email] Payout sent email failed:", error);
  }
}
