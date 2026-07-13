"use client";

import { useEffect } from "react";
import { AFFILIATE_REF_PARAM, normalizeAffiliateCode } from "@/lib/affiliate-code";
import { writeSessionAffiliateRef } from "@/lib/affiliate-ref-session";

/** Remember `?ref=` from any landing URL for the rest of the browser session. */
export default function AffiliateRefSync() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = normalizeAffiliateCode(params.get(AFFILIATE_REF_PARAM));
    if (ref) writeSessionAffiliateRef(ref);
  }, []);

  return null;
}
