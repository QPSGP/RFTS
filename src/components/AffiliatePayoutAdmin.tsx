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
      body: JSON.stringify({ affiliateCode })
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

  if (error) {
    return <p>{error}</p>;
  }

  const readyCount = summaries.filter((s) => s.readyForPayout).length;

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3>Affiliate payout queue</h3>
      <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 12 }}>
        Commissions are recorded automatically when Stripe invoices are paid for referred members
        (25% of each payment). Current minimum payout threshold:{" "}
        <strong>${thresholdUsd}</strong>. Mark paid after you send funds manually.
      </p>
      {message && (
        <p style={{ fontSize: 14, marginBottom: 12, color: "#059669" }}>{message}</p>
      )}
      {summaries.length === 0 ? (
        <p>No commission activity yet. Entries appear when referred members pay through Stripe.</p>
      ) : (
        <>
          <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 12 }}>
            {readyCount} affiliate(s) at or above the ${thresholdUsd} minimum.
          </p>
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
                    <span style={{ color: "#059669" }}> — ready for payout</span>
                  ) : (
                    <span style={{ color: "#6b7280" }}>
                      {" "}
                      — below ${row.thresholdUsd} minimum
                    </span>
                  )}
                </p>
                <p style={{ fontSize: 13, color: "#4b5563" }}>
                  {row.pendingCommissionCount} pending payment(s) ·{" "}
                  {formatUsdFromCents(row.paidBalanceCents)} paid to date
                </p>
                <p>
                  Payout method: {formatAffiliatePayoutMethodLabel(row.payoutMethod)}
                </p>
                {row.payoutDetail && <p>Payout details: {row.payoutDetail}</p>}
                <button
                  className="button"
                  type="button"
                  disabled={!row.readyForPayout || markingCode === row.affiliateCode}
                  onClick={() => markPaid(row.affiliateCode)}
                >
                  {markingCode === row.affiliateCode ? "Marking…" : "Mark pending as paid"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
