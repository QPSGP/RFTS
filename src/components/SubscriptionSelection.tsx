"use client";

import { useMemo, useState } from "react";

type Plan = {
  id: string;
  label: string;
  priceId: string;
  trialDays: number;
  description: string;
  displayPrice: string;
  stripClass: "platinum" | "gold" | "bronze";
  features: string[];
};

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function SubscriptionSelection() {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const plans = useMemo<Plan[]>(() => {
    return [
      {
        id: "starter",
        label: "Bronze Package",
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || "",
        trialDays: toNumber(process.env.NEXT_PUBLIC_STRIPE_TRIAL_STARTER, 7),
        description: "Total of recordings as published.",
        displayPrice: "$14.95",
        stripClass: "bronze",
        features: [
          "15 minute guided meditation",
          "Push button and listen to it",
          "No charge until trial ends"
        ]
      },
      {
        id: "growth",
        label: "Gold Package",
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH || "",
        trialDays: toNumber(process.env.NEXT_PUBLIC_STRIPE_TRIAL_GROWTH, 14),
        description: "Includes everything from the Bronze package, plus:",
        displayPrice: "$24.95",
        stripClass: "gold",
        features: [
          "Listening history and session saves",
          "Mood change guide every 90 days",
          "Expanded playlist library"
        ]
      },
      {
        id: "elite",
        label: "Platinum Package",
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE || "",
        trialDays: toNumber(process.env.NEXT_PUBLIC_STRIPE_TRIAL_ELITE, 21),
        description: "Includes everything from Gold Package, plus:",
        displayPrice: "$39.95",
        stripClass: "platinum",
        features: [
          "Unlimited access to all recordings",
          "Session refresh every 90 days",
          "Priority creator releases"
        ]
      }
    ].filter((plan) => plan.priceId);
  }, []);

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
            <div className={`plan-strip ${plan.stripClass}`}>
              {selectedId === plan.id ? "Selected Subscription" : plan.label}
            </div>
            <div className="plan-body">
              <div className="plan-title">{plan.label}</div>
              <div className="plan-price">
                {plan.displayPrice} <span style={{ fontSize: 12 }}>/mo</span>
              </div>
              <div className="plan-trial">{plan.trialDays}-Day Free Trial</div>
              <p style={{ fontSize: 12, color: "#4b5563" }}>{plan.description}</p>
              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
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
