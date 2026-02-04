"use client";

import { useEffect, useMemo, useState } from "react";
import type { SubscriptionPlan } from "@/lib/types";

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/subscriptions");
    const data = await response.json();
    setPlans(data.plans || []);
  };

  useEffect(() => {
    load();
  }, []);

  const visiblePlans = useMemo(() => {
    const membershipOnly = plans.filter((plan) => plan.id === "platinum");
    return membershipOnly.length > 0 ? membershipOnly : plans;
  }, [plans]);

  const updatePlan = (
    planId: string,
    field: keyof SubscriptionPlan,
    value: string | number
  ) => {
    const updated = plans.map((plan) =>
      plan.id === planId ? { ...plan, [field]: value } : plan
    );
    setPlans(updated);
  };

  const savePlans = async () => {
    setStatus(null);
    const response = await fetch("/api/subscriptions", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plans: visiblePlans })
    });
    if (response.ok) {
      setStatus("Plans saved.");
    } else {
      const data = await response.json().catch(() => ({}));
      setStatus(
        data?.error ||
          `Unable to save plans. Admin login required. (status ${response.status})`
      );
    }
  };

  return (
    <div className="card">
      <h2>Subscription Plans</h2>
      <p>Manage plan names, descriptions, trial days, and Stripe price IDs.</p>
      <div className="grid">
        {visiblePlans.map((plan) => (
          <div key={plan.id} className="card">
            <label style={{ fontSize: 12 }}>Plan Name</label>
            <input
              style={inputStyle}
              value={plan.name}
              onChange={(event) => updatePlan(plan.id, "name", event.target.value)}
            />
            <label style={{ fontSize: 12 }}>Description</label>
            <input
              style={inputStyle}
              value={plan.description}
              onChange={(event) =>
                updatePlan(plan.id, "description", event.target.value)
              }
            />
            <label style={{ fontSize: 12 }}>Trial Days</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              max={365}
              value={plan.trialDays}
              onChange={(event) =>
                updatePlan(plan.id, "trialDays", Number(event.target.value))
              }
            />
            <label style={{ fontSize: 12 }}>Stripe Price ID</label>
            <input
              style={inputStyle}
              value={plan.priceId}
              onChange={(event) => updatePlan(plan.id, "priceId", event.target.value)}
            />
          </div>
        ))}
      </div>
      <button className="button" style={{ marginTop: 12 }} onClick={savePlans}>
        Save Plans
      </button>
      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}
