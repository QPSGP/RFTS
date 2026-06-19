"use client";

import { useCallback, useState } from "react";

export type MemberBillingInfo = {
  planName: string;
  statusLabel: string;
  subscriptionStatus: string | null;
  canManageBilling: boolean;
  needsPayment: boolean;
  stripeConfigured: boolean;
  hasStripeBilling: boolean;
};

export async function openMemberBilling(returnPath = "/member/profile"): Promise<string | null> {
  const res = await fetch("/api/member/billing-portal", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnPath })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Could not open billing.");
  }
  if (typeof data.url === "string" && data.url) {
    return data.url;
  }
  throw new Error("Could not open billing.");
}

type Props = {
  billing: MemberBillingInfo | null;
  returnPath?: string;
};

export default function MemberBillingSection({ billing, returnPath = "/member/profile" }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleBilling = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const url = await openMemberBilling(returnPath);
      if (url) {
        window.location.href = url;
        return;
      }
      setMessage("Could not open billing. Try again or contact support.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not open billing.");
    } finally {
      setLoading(false);
    }
  }, [returnPath]);

  if (!billing) return null;

  const showManageBilling = billing.canManageBilling;
  const showCompletePayment = billing.needsPayment;
  const showLinkBilling =
    billing.stripeConfigured &&
    !billing.hasStripeBilling &&
    billing.subscriptionStatus === "active";
  const showActiveNoStripe =
    billing.subscriptionStatus === "active" &&
    !billing.hasStripeBilling &&
    !billing.stripeConfigured;

  return (
    <section
      style={{
        marginTop: 32,
        padding: 20,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "#fafafa"
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 20 }}>Payment &amp; subscription</h2>
      <p style={{ margin: "0 0 4px", fontSize: 15 }}>
        <strong>Plan:</strong> {billing.planName}
      </p>
      <p style={{ margin: "0 0 16px", fontSize: 15 }}>
        <strong>Status:</strong> {billing.statusLabel}
      </p>

      {(showManageBilling || showLinkBilling) && (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#4b5563" }}>
            {showLinkBilling
              ? "If you pay through Stripe, open billing to link your subscription and update your card."
              : "Update your card, view invoices, or manage your subscription in Stripe's secure billing portal."}
          </p>
          <button
            type="button"
            className="button"
            onClick={handleBilling}
            disabled={loading}
          >
            {loading ? "Opening…" : "Manage billing"}
          </button>
        </>
      )}

      {showCompletePayment && (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#4b5563" }}>
            Complete payment once to activate your membership. You can update your card later from
            this page.
          </p>
          <button
            type="button"
            className="button"
            onClick={handleBilling}
            disabled={loading}
          >
            {loading ? "Opening…" : "Complete payment"}
          </button>
        </>
      )}

      {showActiveNoStripe && (
        <p style={{ margin: 0, fontSize: 14, color: "#4b5563" }}>
          Your membership is active. Contact support if you need billing help.
        </p>
      )}

      {!showManageBilling &&
        !showCompletePayment &&
        !showLinkBilling &&
        !showActiveNoStripe &&
        billing.subscriptionStatus === "active" &&
        !billing.stripeConfigured && (
          <p style={{ margin: 0, fontSize: 14, color: "#4b5563" }}>
            Your membership is active. Contact support if you need billing help.
          </p>
        )}

      {!showManageBilling &&
        !showCompletePayment &&
        !showLinkBilling &&
        !showActiveNoStripe &&
        billing.subscriptionStatus !== "active" &&
        !billing.stripeConfigured && (
          <p style={{ margin: 0, fontSize: 14, color: "#4b5563" }}>
            Online payment is not available yet. Contact support to activate your membership.
          </p>
        )}

      {message && (
        <p style={{ margin: "12px 0 0", fontSize: 14, color: "#dc2626" }}>{message}</p>
      )}
    </section>
  );
}
