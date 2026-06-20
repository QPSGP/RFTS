"use client";

import { useEffect, useState } from "react";
import { formatAffiliatePayoutMethodLabel } from "@/lib/affiliate-payout";
import type { AffiliateRecord } from "@/lib/types";

export default function AffiliateAdmin() {
  const [affiliates, setAffiliates] = useState<AffiliateRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/affiliates");
    if (!response.ok) {
      setError("Admin session required.");
      return;
    }
    const data = await response.json();
    setAffiliates(data.affiliates || []);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: AffiliateRecord["status"]) => {
    const response = await fetch("/api/affiliates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status })
    });
    if (response.ok) {
      await load();
    }
  };

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="card">
      <h3>Affiliate Approvals</h3>
      <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 12 }}>
        Members already receive an affiliate number in My Profile. Applications here are for
        non-members who want payout setup before or without a membership.
      </p>
      {affiliates.length === 0 ? (
        <p>No affiliate applications yet.</p>
      ) : (
        <div className="grid">
          {affiliates.map((affiliate) => (
            <div key={affiliate.id} className="card">
              <strong>{affiliate.name}</strong>
              <p>{affiliate.email}</p>
              {affiliate.affiliateCode && <p>Affiliate #: {affiliate.affiliateCode}</p>}
              {affiliate.userId && (
                <p style={{ fontSize: 13, color: "#059669" }}>Linked member account</p>
              )}
              <p>
                Payout method: {formatAffiliatePayoutMethodLabel(affiliate.payoutMethod ?? "crypto")}
              </p>
              {affiliate.payoutAddress && <p>Payout details: {affiliate.payoutAddress}</p>}
              <p>Status: {affiliate.status}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="button"
                  onClick={() => updateStatus(affiliate.id, "approved")}
                >
                  Approve
                </button>
                <button
                  className="button button-secondary"
                  onClick={() => updateStatus(affiliate.id, "paused")}
                >
                  Pause
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
