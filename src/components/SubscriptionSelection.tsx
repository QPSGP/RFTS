"use client";

import { useEffect, useMemo, useState } from "react";
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
  const membershipDetails = [
    "Tailored Recordings Are Scheduled Based on Your Priorities.",
    "Push A Button And Listen While You Sleep!",
    "Listen to Tailored Recordings out of Sequence as Needed",
    "Unlimited Access to All Recordings in the Success Center Library!",
    "You May Update Goals Anytime!",
    "Includes a 15-minute Private Goal Setting Consultation every 90 days with a Success Center hypnotherapist/coach ($444 value annual benefit). Call 800-GOAL-NOW to set your appointment today."
  ];
  const membershipNote =
    "Recommend a private Life Guidance Discovery Session for full access to Member benefits.";

  const visiblePlans = useMemo(() => {
    const membershipOnly = plans.filter((plan) => plan.id === "platinum");
    return membershipOnly.length > 0 ? membershipOnly : plans;
  }, [plans]);

  useEffect(() => {
    if (!selectedId && visiblePlans.length > 0) {
      setSelectedId(visiblePlans[0].id);
    }
  }, [selectedId, visiblePlans]);

  const selectedPlan = visiblePlans.find((plan) => plan.id === selectedId);

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
      <div className="membership-package-section">
        <div className="section-heading">Select Your Membership Package</div>
        <div className="plan-grid">
        {visiblePlans.map((plan) => {
          const displayName =
            plan.id === "platinum" ? "Membership Package" : plan.name;
          return (
          <button
            key={plan.id}
            type="button"
            className={`plan-card ${selectedId === plan.id ? "selected" : ""}`}
            onClick={() => setSelectedId(plan.id)}
            style={{ cursor: "pointer" }}
          >
            <div className={`plan-strip ${mapStripClass(plan.id)}`}>
              {selectedId === plan.id ? "Selected Subscription" : displayName}
            </div>
            <div className="plan-body">
              <div className="plan-title">{displayName}</div>
              <div className="plan-trial">{plan.trialDays}-Day Free Trial</div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#4b5563" }}>
                <div style={{ fontWeight: 600, color: "#0f172a", textAlign: "center" }}>
                  $39.95/mo. + tax and fees
                </div>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {membershipDetails.map((line) => (
                    <li key={line} style={{ marginTop: 6 }}>
                      {line}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 8, fontStyle: "italic" }}>
                  {membershipNote}
                </div>
              </div>
              <div className="plan-cta">
                <span className="badge">Select Plan</span>
              </div>
            </div>
          </button>
          );
        })}
        </div>
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
