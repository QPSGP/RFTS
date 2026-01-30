"use client";

import { useMemo, useState } from "react";

type Plan = {
  label: string;
  priceId: string;
  trialDays: number;
  description: string;
};

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function SubscriptionPlans() {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const plans = useMemo<Plan[]>(() => {
    return [
      {
        label: "Starter",
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || "",
        trialDays: toNumber(process.env.NEXT_PUBLIC_STRIPE_TRIAL_STARTER, 7),
        description: "Core audio library and weekly reset."
      },
      {
        label: "Growth",
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH || "",
        trialDays: toNumber(process.env.NEXT_PUBLIC_STRIPE_TRIAL_GROWTH, 14),
        description: "Full library, playlists, and sleep bundles."
      },
      {
        label: "Elite",
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE || "",
        trialDays: toNumber(process.env.NEXT_PUBLIC_STRIPE_TRIAL_ELITE, 21),
        description: "Premium content, live drops, and concierge support."
      }
    ].filter((plan) => plan.priceId);
  }, []);

  const startCheckout = async (plan: Plan) => {
    if (!plan.priceId) {
      setStatus("Stripe price ID is not configured.");
      return;
    }
    setIsLoading(plan.label);
    setStatus(null);
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId: plan.priceId,
        trialDays: plan.trialDays,
        successPath: "/",
        cancelPath: "/"
      })
    });
    if (!response.ok) {
      setStatus("Checkout failed. Please try again.");
      setIsLoading(null);
      return;
    }
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    setStatus("Checkout session did not return a URL.");
    setIsLoading(null);
  };

  return (
    <div className="card">
      <h3>Fiat Membership (Stripe)</h3>
      <p>Select a plan to start a subscription with a free trial.</p>
      <div className="grid">
        {plans.map((plan) => (
          <div key={plan.label} className="card">
            <strong>{plan.label}</strong>
            <p>{plan.description}</p>
            <p>Trial: {plan.trialDays} days</p>
            <button
              className="button"
              onClick={() => startCheckout(plan)}
              disabled={isLoading === plan.label}
            >
              {isLoading === plan.label ? "Redirecting..." : "Start Trial"}
            </button>
          </div>
        ))}
      </div>
      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}
