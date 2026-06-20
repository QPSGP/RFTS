"use client";

import { useState } from "react";
import {
  AFFILIATE_PAYOUT_DETAIL_PLACEHOLDERS,
  AFFILIATE_PAYOUT_METHOD_LABELS,
  AFFILIATE_PAYOUT_METHODS,
  formatAffiliatePayoutThresholdPolicy,
  type AffiliatePayoutMethod
} from "@/lib/affiliate-payout";

export default function AffiliateForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<AffiliatePayoutMethod>("crypto");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      payoutMethod: formData.get("payoutMethod"),
      payoutDetail: formData.get("payoutDetail")
    };
    const response = await fetch("/api/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      setStatus("Application submitted. We will review within 48 hours.");
      event.currentTarget.reset();
      setPayoutMethod("crypto");
    } else {
      setStatus("Something went wrong. Please try again.");
    }
    setIsSubmitting(false);
  };

  const detailRequired = payoutMethod !== "bank_contact";

  return (
    <div className="card">
      <h2>Apply to the Affiliate Program</h2>
      <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 12 }}>
        Already a member? Your affiliate number and referral link are in My Profile — you do not
        need to apply here. This form is for non-members who want affiliate payout setup.
      </p>
      <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 12 }}>
        {formatAffiliatePayoutThresholdPolicy()}
      </p>
      <form onSubmit={onSubmit} className="grid">
        <input
          name="name"
          placeholder="Full name"
          required
          style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
        />
        <input
          name="email"
          placeholder="Email"
          type="email"
          required
          style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
        />
        <label style={{ fontSize: 14, color: "#4b5563" }}>
          Payout method
          <select
            name="payoutMethod"
            value={payoutMethod}
            onChange={(e) => setPayoutMethod(e.target.value as AffiliatePayoutMethod)}
            required
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              padding: 12,
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
          name="payoutDetail"
          placeholder={AFFILIATE_PAYOUT_DETAIL_PLACEHOLDERS[payoutMethod]}
          required={detailRequired}
          style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
        />
        {payoutMethod === "bank_contact" && (
          <p style={{ fontSize: 13, color: "#4b5563", margin: 0 }}>
            We will contact you to collect bank details for ACH payouts.
          </p>
        )}
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </button>
      </form>
      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}
