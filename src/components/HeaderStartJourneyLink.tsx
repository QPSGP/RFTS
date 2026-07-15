"use client";

import { LANDING_TRIAL_CTA_LABEL } from "@/lib/marketing-signup";
import { useAffiliateSignupHref } from "@/hooks/useAffiliateSignupHref";

export default function HeaderStartJourneyLink() {
  const href = useAffiliateSignupHref();

  return (
    <a className="button header-cta header-start-btn" href={href}>
      <span className="header-btn-long">{LANDING_TRIAL_CTA_LABEL}</span>
      <span className="header-btn-short">Free trial</span>
    </a>
  );
}
