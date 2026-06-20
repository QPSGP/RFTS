import crypto from "crypto";
import { getPublicSiteUrl } from "@/lib/site-url";

export const AFFILIATE_REF_PARAM = "ref";

export function normalizeAffiliateCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  if (!code || code.length < 4 || code.length > 20) return null;
  if (!/^[A-Z0-9]+$/.test(code)) return null;
  return code;
}

export function generateAffiliateCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export function buildMemberReferralUrl(
  affiliateCode: string,
  baseUrl?: string
): string {
  const base = (baseUrl || getPublicSiteUrl()).replace(/\/$/, "");
  const code = normalizeAffiliateCode(affiliateCode);
  const path = "/signup/step-1-subscription-selection";
  if (!code) return `${base}${path}`;
  return `${base}${path}?${AFFILIATE_REF_PARAM}=${encodeURIComponent(code)}`;
}
