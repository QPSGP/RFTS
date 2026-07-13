"use client";

import { useAffiliateSignupHref } from "@/hooks/useAffiliateSignupHref";

export default function HeaderStartJourneyLink() {
  const href = useAffiliateSignupHref();

  return (
    <a className="button header-cta header-start-btn" href={href}>
      <span className="header-btn-long">Start Your Journey</span>
      <span className="header-btn-short">Start</span>
    </a>
  );
}
