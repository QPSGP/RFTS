import crypto from "crypto";
import { getPublicSiteUrl } from "@/lib/site-url";
import { SIGNUP_PATH } from "@/lib/marketing-signup";

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
  if (!code) return `${base}${SIGNUP_PATH}`;
  return buildAffiliatePageUrl(SIGNUP_PATH, code, base);
}

/** Any site path with `?ref=` (or `&ref=`) for affiliate sharing. */
export function buildAffiliatePageUrl(
  path: string,
  affiliateCode: string | null | undefined,
  baseUrl?: string
): string {
  const code = normalizeAffiliateCode(affiliateCode);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = (baseUrl || "").replace(/\/$/, "");
  const pathAndQuery = normalizedPath;
  if (!code) {
    return base ? `${base}${pathAndQuery}` : pathAndQuery;
  }
  const joiner = pathAndQuery.includes("?") ? "&" : "?";
  const withRef = `${pathAndQuery}${joiner}${AFFILIATE_REF_PARAM}=${encodeURIComponent(code)}`;
  return base ? `${base}${withRef}` : withRef;
}
