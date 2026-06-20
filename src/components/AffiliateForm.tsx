"use client";

import { useState } from "react";

export default function AffiliateForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      payoutAddress: formData.get("payoutAddress")
    };
    const response = await fetch("/api/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      setStatus("Application submitted. We will review within 48 hours.");
      event.currentTarget.reset();
    } else {
      setStatus("Something went wrong. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="card">
      <h2>Apply to the Affiliate Program</h2>
      <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 12 }}>
        Already a member? Your affiliate number and referral link are in My Profile — you do not
        need to apply here. This form is for non-members who want affiliate payout setup.
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
        <input
          name="payoutAddress"
          placeholder="Crypto payout address"
          required
          style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
        />
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </button>
      </form>
      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}
