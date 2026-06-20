import { sql } from "@vercel/postgres";
import { buildMemberReferralUrl } from "@/lib/affiliate-code";
import { ensureUserAffiliateCode, normalizeMemberEmail } from "@/lib/db";

export type MemberAffiliateSummary = {
  affiliateCode: string;
  referralUrl: string;
  applicationStatus: "pending" | "approved" | "paused" | null;
  isApprovedAffiliate: boolean;
};

export async function getMemberAffiliateSummary(
  userId: string,
  email: string
): Promise<MemberAffiliateSummary> {
  const code = await ensureUserAffiliateCode(userId);
  const referralUrl = buildMemberReferralUrl(code);
  const canonical = normalizeMemberEmail(email);
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
    isApprovedAffiliate: normalizedStatus === "approved" || normalizedStatus === null
  };
}
