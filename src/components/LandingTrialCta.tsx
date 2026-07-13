"use client";

import { useAffiliateSignupHref } from "@/hooks/useAffiliateSignupHref";
import {
  buildMarketingSignupHref,
  LANDING_TRIAL_CTA_LABEL
} from "@/lib/marketing-signup";

export const LANDING_TRIAL_SIGNUP_HREF = buildMarketingSignupHref();
export { LANDING_TRIAL_CTA_LABEL };

type LandingTrialCtaButtonsProps = {
  signupHref?: string;
};

export function LandingTrialCtaButtons({
  signupHref = LANDING_TRIAL_SIGNUP_HREF
}: LandingTrialCtaButtonsProps) {
  const href = useAffiliateSignupHref(signupHref);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
      <a className="button" href={href}>
        {LANDING_TRIAL_CTA_LABEL}
      </a>
      <a className="button button-secondary" href="/how-it-works">
        How it works
      </a>
    </div>
  );
}

type LandingTrialCtaBandProps = {
  signupHref?: string;
  body: string;
};

export function LandingTrialCtaBand({
  signupHref = LANDING_TRIAL_SIGNUP_HREF,
  body
}: LandingTrialCtaBandProps) {
  const href = useAffiliateSignupHref(signupHref);

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="card glow" style={{ textAlign: "center", padding: 24 }}>
        <p style={{ marginTop: 0, marginBottom: 16, color: "#475569", lineHeight: 1.6 }}>{body}</p>
        <a className="button" href={href}>
          {LANDING_TRIAL_CTA_LABEL}
        </a>
      </div>
    </section>
  );
}
