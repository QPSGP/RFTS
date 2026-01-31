"use client";

import { useState } from "react";
import type { SubscriptionPlan } from "@/lib/types";

type SubscriptionSelectionProps = {
  plans: SubscriptionPlan[];
};

const mapStripClass = (id: string) => {
  if (id === "platinum") return "platinum";
  if (id === "gold") return "gold";
  return "bronze";
};

export default function SubscriptionSelection({ plans }: SubscriptionSelectionProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedPlan = plans.find((plan) => plan.id === selectedId);

  const startCheckout = async () => {
    if (!selectedPlan) {
      setStatus("Select a plan to continue.");
      return;
    }
    setIsLoading(true);
    setStatus(null);
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId: selectedPlan.priceId,
        trialDays: selectedPlan.trialDays,
        successPath: "/",
        cancelPath: "/signup/step-1-subscription-selection"
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
    <div>
      <div className="stepper">
        {[
          "Subscription Selection",
          "Personal Details",
          "Payment Details",
          "Review and Confirm"
        ].map((label, index) => (
          <div key={label} className="stepper-item">
            <span className={`stepper-dot ${index === 0 ? "active" : ""}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="section-heading">Select Your Subscription Package</div>
      <div className="plan-grid">
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            className={`plan-card ${selectedId === plan.id ? "selected" : ""}`}
            onClick={() => setSelectedId(plan.id)}
            style={{ cursor: "pointer" }}
          >
            <div className={`plan-strip ${mapStripClass(plan.id)}`}>
              {selectedId === plan.id ? "Selected Subscription" : plan.name}
            </div>
            <div className="plan-body">
              <div className="plan-title">{plan.name}</div>
              <div className="plan-price">{plan.trialDays} day trial</div>
              <div className="plan-trial">{plan.trialDays}-Day Free Trial</div>
              <p style={{ fontSize: 12, color: "#4b5563" }}>{plan.description}</p>
              <div className="plan-cta">
                <span className="badge">Select Plan</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <button className="button" onClick={startCheckout} disabled={isLoading}>
          {isLoading ? "Redirecting..." : "Continue"}
        </button>
        <span style={{ alignSelf: "center", color: "#64748b" }}>
          Secure checkout with Stripe
        </span>
      </div>
      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}
