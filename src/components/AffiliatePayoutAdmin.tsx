"use client";

import { useEffect, useState } from "react";
import { formatUsdFromCents } from "@/lib/affiliate-payout";
import { formatAffiliatePayoutMethodLabel } from "@/lib/affiliate-payout";
import type { AffiliatePayoutSummary } from "@/lib/types";

export default function AffiliatePayoutAdmin() {
  const [summaries, setSummaries] = useState<AffiliatePayoutSummary[]>([]);
  const [thresholdUsd, setThresholdUsd] = useState<number>(25);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [markingCode, setMarkingCode] = useState<string | null>(null);
  const [connectRunningCode, setConnectRunningCode] = useState<string | null>(null);
  const [connectRunningAll, setConnectRunningAll] = useState(false);

  const load = async () => {
    const response = await fetch("/api/admin/affiliate-payouts");
    if (!response.ok) {
      setError("Admin session required.");
      return;
    }
    const data = await response.json();
    setSummaries(data.summaries || []);
    setThresholdUsd(data.thresholdUsd ?? 25);
    setError(null);
  };

  useEffect(() => {
    load();
  }, []);

  const markPaid = async (affiliateCode: string) => {
    setMarkingCode(affiliateCode);
    setMessage(null);
    const response = await fetch("/api/admin/affiliate-payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_paid", affiliateCode })
    });
    if (response.ok) {
      const data = await response.json();
      setMessage(
        `Marked ${data.markedCount} commission(s) paid for affiliate ${affiliateCode}.`
      );
      await load();
    } else {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error || "Could not mark commissions paid.");
    }
    setMarkingCode(null);
  };

  const runConnectPayout = async (affiliateCode?: string) => {
    if (affiliateCode) {
      setConnectRunningCode(affiliateCode);
    } else {
      setConnectRunningAll(true);
    }
    setMessage(null);
    const response = await fetch("/api/admin/affiliate-payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "run_connect",
        affiliateCode: affiliateCode ?? undefined
      })
    });
    if (response.ok) {
      const data = await response.json();
      if (affiliateCode) {
        setMessage(
          `Stripe Connect transfer ${data.transferId} sent (${formatUsdFromCents(data.amountCents ?? 0)}); ${data.markedCount} commission(s) marked paid.`
        );
      } else {
        setMessage(
          `Stripe Connect batch: ${data.succeededCount} succeeded, ${data.failedCount} failed.`
        );
      }
      await load();
    } else {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error || "Stripe Connect payout failed.");
    }
    setConnectRunningCode(null);
    setConnectRunningAll(false);
  };

  if (error) {
    return <p>{error}</p>;
  }

  const readyCount = summaries.filter((s) => s.readyForPayout).length;
  const connectReadyCount = summaries.filter(
    (s) => s.readyForPayout && s.stripeConnectReady
  ).length;

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3>Affiliate payout queue</h3>
      <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 12 }}>
        Commissions are recorded automatically when Stripe invoices are paid for referred members
        (25% of each payment). Current minimum payout threshold:{" "}
        <strong>${thresholdUsd}</strong>. Stripe Connect payouts run automatically on the{" "}
        <strong>1st of each month</strong> (14:00 UTC) for affiliates who completed onboarding.
        Use the buttons below for manual runs, or mark paid after PayPal/Venmo/Zelle/crypto payouts.
      </p>
      {message && (
        <p style={{ fontSize: 14, marginBottom: 12, color: "#059669" }}>{message}</p>
      )}
      {summaries.length === 0 ? (
        <p>No commission activity yet. Entries appear when referred members pay through Stripe.</p>
      ) : (
        <>
          <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 12 }}>
            {readyCount} affiliate(s) at or above the ${thresholdUsd} minimum ·{" "}
            {connectReadyCount} ready for Stripe Connect.
          </p>
          {connectReadyCount > 0 && (
            <button
              className="button"
              type="button"
              disabled={connectRunningAll}
              onClick={() => runConnectPayout()}
              style={{ marginBottom: 16 }}
            >
              {connectRunningAll ? "Running Connect payouts…" : "Run all Stripe Connect payouts"}
            </button>
          )}
          <div className="grid">
            {summaries.map((row) => (
              <div key={row.affiliateCode} className="card">
                <strong>
                  {row.affiliateName || row.affiliateEmail || row.affiliateCode}
                </strong>
                <p>Affiliate #: {row.affiliateCode}</p>
                {row.affiliateEmail && <p>{row.affiliateEmail}</p>}
                <p>
                  Pending balance:{" "}
                  <strong>{formatUsdFromCents(row.pendingBalanceCents)}</strong>
                  {row.readyForPayout ? (
                    <span style={{ color: "#059669" }}> - ready for payout</span>
                  ) : (
                    <span style={{ color: "#6b7280" }}>
                      {" "}
                      - below ${row.thresholdUsd} minimum
                    </span>
                  )}
                </p>
                <p style={{ fontSize: 13, color: "#4b5563" }}>
                  {row.pendingCommissionCount} pending payment(s) ·{" "}
                  {formatUsdFromCents(row.paidBalanceCents)} paid to date
                </p>
                <p>
                  Stripe Connect:{" "}
                  {row.stripeConnectReady
                    ? "ready for automatic payout"
                    : row.stripeConnectAccountId
                      ? "onboarding incomplete"
                      : "not set up"}
                </p>
                <p>
                  Manual payout method: {formatAffiliatePayoutMethodLabel(row.payoutMethod)}
                </p>
                {row.payoutDetail && <p>Manual payout details: {row.payoutDetail}</p>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {row.readyForPayout && row.stripeConnectReady && (
                    <button
                      className="button"
                      type="button"
                      disabled={connectRunningCode === row.affiliateCode}
                      onClick={() => runConnectPayout(row.affiliateCode)}
                    >
                      {connectRunningCode === row.affiliateCode
                        ? "Sending…"
                        : "Run Stripe Connect payout"}
                    </button>
                  )}
                  <button
                    className="button"
                    type="button"
                    disabled={!row.readyForPayout || markingCode === row.affiliateCode}
                    onClick={() => markPaid(row.affiliateCode)}
                  >
                    {markingCode === row.affiliateCode ? "Marking…" : "Mark manual payout paid"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
