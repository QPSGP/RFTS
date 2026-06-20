import { sql } from "@vercel/postgres";
import type { AffiliatePayoutMethod } from "@/lib/affiliate-payout";
import { normalizeAffiliatePayoutMethod } from "@/lib/affiliate-payout";
import { buildMemberReferralUrl } from "@/lib/affiliate-code";
import {
  ensureUserAffiliateCode,
  getMemberProfileByUserId,
  normalizeMemberEmail
} from "@/lib/db";

export type MemberAffiliateSummary = {
  affiliateCode: string;
  referralUrl: string;
  applicationStatus: "pending" | "approved" | "paused" | null;
  isApprovedAffiliate: boolean;
  payoutMethod: AffiliatePayoutMethod | null;
  payoutDetail: string | null;
};

export async function getMemberAffiliateSummary(
  userId: string,
  email: string
): Promise<MemberAffiliateSummary> {
  const code = await ensureUserAffiliateCode(userId);
  const referralUrl = buildMemberReferralUrl(code);
  const canonical = normalizeMemberEmail(email);
  const memberProfile = await getMemberProfileByUserId(userId);
  const payoutMethod = normalizeAffiliatePayoutMethod(
    memberProfile?.affiliatePayoutMethod ?? null
  );
  const payoutDetail = memberProfile?.affiliatePayoutDetail?.trim() || null;

  const { rows } = await sql<{ status: string | null }>`
    SELECT status
    FROM affiliate_applications
    WHERE user_id = ${userId} OR LOWER(email) = LOWER(${canonical})
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const appStatus = rows[0]?.status ?? null;
  const normalizedStatus =
    appStatus === "pending" || appStatus === "approved" || appStatus === "paused"
      ? appStatus
      : null;

  return {
    affiliateCode: code,
    referralUrl,
    applicationStatus: normalizedStatus,
    isApprovedAffiliate: normalizedStatus === "approved" || normalizedStatus === null,
    payoutMethod,
    payoutDetail
  };
}
