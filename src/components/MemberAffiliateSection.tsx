"use client";

import { useCallback, useEffect, useState } from "react";
import AffiliateShareLinks from "@/components/AffiliateShareLinks";
import {
  AFFILIATE_PAYOUT_DETAIL_PLACEHOLDERS,
  AFFILIATE_PAYOUT_METHOD_LABELS,
  AFFILIATE_PAYOUT_METHODS,
  formatAffiliatePayoutMethodLabel,
  formatAffiliatePayoutThresholdPolicy,
  type AffiliatePayoutMethod
} from "@/lib/affiliate-payout";
import { formatUsdFromCents } from "@/lib/affiliate-payout";

export type MemberAffiliateInfo = {
  affiliateCode: string;
  referralUrl: string;
  applicationStatus: "pending" | "approved" | "paused" | null;
  isApprovedAffiliate: boolean;
  payoutMethod?: AffiliatePayoutMethod | null;
  payoutDetail?: string | null;
  pendingBalanceCents?: number;
  thresholdUsd?: number;
  readyForPayout?: boolean;
};

type Props = {
  affiliate: MemberAffiliateInfo | null;
  onPayoutSaved?: () => void;
};

export default function MemberAffiliateSection({ affiliate, onPayoutSaved }: Props) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<AffiliatePayoutMethod>(
    affiliate?.payoutMethod ?? "crypto"
  );
  const [payoutDetail, setPayoutDetail] = useState(affiliate?.payoutDetail ?? "");
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null);
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [connectReady, setConnectReady] = useState(false);
  const [connectStarted, setConnectStarted] = useState(false);

  useEffect(() => {
    setPayoutMethod(affiliate?.payoutMethod ?? "crypto");
    setPayoutDetail(affiliate?.payoutDetail ?? "");
  }, [affiliate?.payoutMethod, affiliate?.payoutDetail]);

  useEffect(() => {
    if (!affiliate?.affiliateCode) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "return") {
      setConnectMessage("Stripe setup updated. We will refresh your payout status.");
    }
    fetch("/api/member/affiliate/connect", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.status) {
          setConnectReady(data.status.readyForTransfers);
          setConnectStarted(Boolean(data.status.accountId));
        }
      })
      .catch(() => {});
  }, [affiliate?.affiliateCode]);

  const startConnectOnboarding = async () => {
    setConnectLoading(true);
    setConnectMessage(null);
    const response = await fetch("/api/member/affiliate/connect", {
      method: "POST",
      credentials: "include"
    });
    if (response.ok) {
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setConnectMessage("Could not start Stripe setup. Try again or contact support.");
    } else {
      setConnectMessage("Could not start Stripe setup. Try again or contact support.");
    }
    setConnectLoading(false);
  };

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

  const savePayout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPayoutSaving(true);
    setPayoutMessage(null);
    const response = await fetch("/api/member/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        affiliatePayoutMethod: payoutMethod,
        affiliatePayoutDetail: payoutDetail
      })
    });
    if (response.ok) {
      setPayoutMessage("Payout preferences saved.");
      onPayoutSaved?.();
    } else {
      setPayoutMessage("Could not save payout preferences. Check your details and try again.");
    }
    setPayoutSaving(false);
  };

  if (!affiliate?.affiliateCode) return null;

  const detailRequired = payoutMethod !== "bank_contact";
  const hasPayoutPrefs = affiliate.payoutMethod != null;

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

      <AffiliateShareLinks affiliateCode={affiliate.affiliateCode} />

      {(affiliate.pendingBalanceCents ?? 0) > 0 && (
        <p style={{ margin: "16px 0 0", fontSize: 14, color: "#4b5563" }}>
          <strong>Pending commission balance:</strong>{" "}
          {formatUsdFromCents(affiliate.pendingBalanceCents ?? 0)}
          {affiliate.readyForPayout ? (
            <span style={{ color: "#059669" }}> — ready for payout</span>
          ) : (
            <span>
              {" "}
              — minimum payout is ${affiliate.thresholdUsd ?? 25}
            </span>
          )}
        </p>
      )}

      <div
        style={{
          marginTop: 24,
          paddingTop: 20,
          borderTop: "1px solid #e5e7eb"
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>Automatic payouts (Stripe)</h3>
        <p style={{ margin: "0 0 12px", fontSize: 14, color: "#4b5563" }}>
          Connect your bank account through Stripe for faster commission payouts when your balance
          reaches the minimum. You can still keep manual payout preferences below as a backup.
        </p>
        {connectReady ? (
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#059669" }}>
            Stripe Connect is active — eligible payouts can be sent automatically.
          </p>
        ) : connectStarted ? (
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#92400e" }}>
            Stripe setup is incomplete. Finish onboarding so we can send payouts to your bank.
          </p>
        ) : null}
        <button
          type="button"
          className="button"
          disabled={connectLoading}
          onClick={startConnectOnboarding}
        >
          {connectLoading
            ? "Opening Stripe…"
            : connectStarted
              ? "Continue Stripe setup"
              : "Set up automatic payouts (Stripe)"}
        </button>
        {connectMessage && (
          <p style={{ margin: "12px 0 0", fontSize: 14, color: "#4b5563" }}>{connectMessage}</p>
        )}
      </div>

      <div
        style={{
          marginTop: 24,
          paddingTop: 20,
          borderTop: "1px solid #e5e7eb"
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>Manual payout preferences</h3>
        <p style={{ margin: "0 0 12px", fontSize: 14, color: "#4b5563" }}>
          {formatAffiliatePayoutThresholdPolicy()}
        </p>
        {hasPayoutPrefs && (
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#4b5563" }}>
            Current: {formatAffiliatePayoutMethodLabel(affiliate.payoutMethod)}
            {affiliate.payoutDetail ? ` — ${affiliate.payoutDetail}` : ""}
          </p>
        )}
        <form onSubmit={savePayout} className="grid" style={{ gap: 10 }}>
          <label style={{ fontSize: 14, color: "#4b5563" }}>
            Payout method
            <select
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value as AffiliatePayoutMethod)}
              required
              style={{
                display: "block",
                width: "100%",
                marginTop: 4,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db"
              }}
            >
              {AFFILIATE_PAYOUT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {AFFILIATE_PAYOUT_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </label>
          <input
            value={payoutDetail}
            onChange={(e) => setPayoutDetail(e.target.value)}
            placeholder={AFFILIATE_PAYOUT_DETAIL_PLACEHOLDERS[payoutMethod]}
            required={detailRequired}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
          />
          {payoutMethod === "bank_contact" && (
            <p style={{ fontSize: 13, color: "#4b5563", margin: 0 }}>
              We will contact you to collect bank details for ACH payouts.
            </p>
          )}
          <button className="button" type="submit" disabled={payoutSaving}>
            {payoutSaving ? "Saving..." : "Save payout preferences"}
          </button>
        </form>
        {payoutMessage && (
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 14,
              color: payoutMessage.includes("saved") ? "#059669" : "#b45309"
            }}
          >
            {payoutMessage}
          </p>
        )}
      </div>
    </section>
  );
}
