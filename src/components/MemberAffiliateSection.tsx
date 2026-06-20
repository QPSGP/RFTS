"use client";

import { useCallback, useState } from "react";

export type MemberAffiliateInfo = {
  affiliateCode: string;
  referralUrl: string;
  applicationStatus: "pending" | "approved" | "paused" | null;
  isApprovedAffiliate: boolean;
};

type Props = {
  affiliate: MemberAffiliateInfo | null;
};

export default function MemberAffiliateSection({ affiliate }: Props) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const copyLink = useCallback(async () => {
    if (!affiliate?.referralUrl) return;
    setCopyMessage(null);
    try {
      await navigator.clipboard.writeText(affiliate.referralUrl);
      setCopyMessage("Referral link copied.");
    } catch {
      setCopyMessage("Could not copy — select and copy the link below.");
    }
  }, [affiliate?.referralUrl]);

  if (!affiliate?.affiliateCode) return null;

  return (
    <section
      style={{
        marginTop: 32,
        padding: 20,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "#fafafa"
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 20 }}>Affiliate program</h2>
      <p style={{ margin: "0 0 12px", fontSize: 14, color: "#4b5563" }}>
        Share Reach For The Stars and earn <strong>25% ongoing</strong> for each member who
        subscribes through your link. Every member receives an affiliate number — use yours to
        help others discover the program.
      </p>
      <p style={{ margin: "0 0 4px", fontSize: 15 }}>
        <strong>Your affiliate number:</strong> {affiliate.affiliateCode}
      </p>
      {affiliate.applicationStatus === "pending" && (
        <p style={{ margin: "8px 0 12px", fontSize: 14, color: "#92400e" }}>
          Your separate affiliate application is pending review. You can still share using the
          number above.
        </p>
      )}
      {affiliate.applicationStatus === "paused" && (
        <p style={{ margin: "8px 0 12px", fontSize: 14, color: "#b45309" }}>
          Your affiliate application is paused. Contact support if you need help.
        </p>
      )}
      <p style={{ margin: "0 0 8px", fontSize: 14, color: "#4b5563" }}>
        <strong>Your referral link:</strong>
      </p>
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 13,
          wordBreak: "break-all",
          padding: 10,
          borderRadius: 8,
          background: "#fff",
          border: "1px solid #e5e7eb"
        }}
      >
        {affiliate.referralUrl}
      </p>
      <button type="button" className="button" onClick={copyLink}>
        Copy referral link
      </button>
      {copyMessage && (
        <p style={{ margin: "12px 0 0", fontSize: 14, color: "#059669" }}>{copyMessage}</p>
      )}
    </section>
  );
}
