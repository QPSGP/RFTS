"use client";

import { useState } from "react";

export default function FiatCheckoutPanel() {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "";

  const startCheckout = async () => {
    if (!priceId) {
      setStatus("Stripe price ID is not configured.");
      return;
    }
    setIsLoading(true);
    setStatus(null);
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId,
        successPath: "/",
        cancelPath: "/"
      })
    });
    if (!response.ok) {
      setStatus("Checkout failed. Please try again.");
      setIsLoading(false);
      return;
    }
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    setStatus("Checkout session did not return a URL.");
    setIsLoading(false);
  };

  return (
    <div className="card">
      <h3>RFTS Fiat Membership (Stripe)</h3>
      <p>
        Accept credit/debit cards via Stripe Checkout. This is ideal for users
        who prefer USD subscriptions.
      </p>
      <button className="button" onClick={startCheckout} disabled={isLoading}>
        {isLoading ? "Redirecting..." : "Pay with Card"}
      </button>
      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}
