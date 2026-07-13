"use client";

import { useAffiliateSignupHref } from "@/hooks/useAffiliateSignupHref";
import { LANDING_TRIAL_CTA_LABEL } from "@/lib/marketing-signup";

type Props = {
  className?: string;
  fallbackHref?: string;
  label?: string;
};

export default function AffiliateSignupLink({
  className = "button",
  fallbackHref,
  label = LANDING_TRIAL_CTA_LABEL
}: Props) {
  const href = useAffiliateSignupHref(fallbackHref);
  return (
    <a className={className} href={href}>
      {label}
    </a>
  );
}
