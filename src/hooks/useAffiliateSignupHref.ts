"use client";

import { useEffect, useState } from "react";
import { AFFILIATE_REF_PARAM, normalizeAffiliateCode } from "@/lib/affiliate-code";
import { readSessionAffiliateRef, writeSessionAffiliateRef } from "@/lib/affiliate-ref-session";
import { buildMarketingSignupHref } from "@/lib/marketing-signup";

/**
 * Signup href that prefers `?ref=` on the current URL, then session ref, then fallback.
 */
export function useAffiliateSignupHref(
  fallbackHref: string = buildMarketingSignupHref()
): string {
  const [href, setHref] = useState(fallbackHref);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRef = normalizeAffiliateCode(params.get(AFFILIATE_REF_PARAM));
    if (urlRef) writeSessionAffiliateRef(urlRef);

    const sessionRef = normalizeAffiliateCode(readSessionAffiliateRef());
    const code = urlRef || sessionRef;
    setHref(code ? buildMarketingSignupHref(code) : fallbackHref);
  }, [fallbackHref]);

  return href;
}
