import {
  AFFILIATE_REF_PARAM,
  normalizeAffiliateCode
} from "@/lib/affiliate-code";
import { getPublicSiteUrl } from "@/lib/site-url";

export const LANDING_TRIAL_CTA_LABEL = "Start 14-day free trial";

/** Canonical signup path (step 1). */
export const SIGNUP_PATH = "/signup/step-1-subscription-selection";

/**
 * Default affiliate code appended to marketing CTAs (blog, landing pages, guest signup links).
 * Set `NEXT_PUBLIC_MARKETING_AFFILIATE_REF` in Vercel / `.env.local` to your code from My Profile.
 */
export function getMarketingAffiliateCode(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_MARKETING_AFFILIATE_REF ||
    process.env.MARKETING_AFFILIATE_REF ||
    "";
  return normalizeAffiliateCode(raw);
}

/** Relative signup href for site CTAs; includes `?ref=` when marketing code is configured. */
export function buildMarketingSignupHref(overrideCode?: string | null): string {
  const code = normalizeAffiliateCode(overrideCode) ?? getMarketingAffiliateCode();
  if (!code) return SIGNUP_PATH;
  return `${SIGNUP_PATH}?${AFFILIATE_REF_PARAM}=${encodeURIComponent(code)}`;
}

/** Absolute signup URL for emails and external campaigns. */
export function buildMarketingSignupUrl(baseUrl?: string): string {
  const href = buildMarketingSignupHref();
  const base = (baseUrl || getPublicSiteUrl()).replace(/\/$/, "");
  return `${base}${href}`;
}
