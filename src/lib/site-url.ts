/** Canonical production host (apex, no www). */
export const PRODUCTION_SITE_HOST = "reachforthestars.today";

export const PRODUCTION_SITE_URL = `https://${PRODUCTION_SITE_HOST}`;

/**
 * Production alias on Vercel. Subpaths redirect in vercel.json, but the
 * homepage does not, so middleware sends this host to the apex as well.
 */
export const LEGACY_VERCEL_HOST = "rfts-7d4w.vercel.app";

/**
 * Public site base URL for Stripe redirects, checkout, billing portal return URLs.
 * Prefer NEXT_PUBLIC_SITE_URL, then NEXT_PUBLIC_APP_URL, then production default or localhost in dev.
 */
export function getPublicSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }
  return "http://localhost:3000";
}

/**
 * Base URL for links in emails. Honors NEXT_PUBLIC_APP_URL, optional request origin, then production default.
 */
export function getPublicAppUrl(origin?: string | null): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (origin) {
    return origin.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }
  return "http://localhost:3000";
}

/**
 * Absolute URL when this host should leave for the apex site. Preserves path and query.
 * Returns null for the apex host, preview deployments, and localhost.
 */
export function canonicalHostRedirectUrl(
  host: string | null | undefined,
  pathname: string,
  search: string
): string | null {
  const normalized = host?.split(":")[0]?.toLowerCase();
  if (normalized === `www.${PRODUCTION_SITE_HOST}` || normalized === LEGACY_VERCEL_HOST) {
    return `${PRODUCTION_SITE_URL}${pathname}${search}`;
  }
  return null;
}

/** Cookie domain for member/admin sessions on the production apex + www hostnames. */
export function getProductionCookieDomain(host: string | null | undefined): string | undefined {
  const fromEnv = process.env.MEMBER_SESSION_COOKIE_DOMAIN?.trim();
  if (fromEnv) return fromEnv;
  const normalized = host?.split(":")[0]?.toLowerCase();
  if (!normalized || normalized.endsWith(".vercel.app")) return undefined;
  if (normalized === PRODUCTION_SITE_HOST || normalized === `www.${PRODUCTION_SITE_HOST}`) {
    return `.${PRODUCTION_SITE_HOST}`;
  }
  return undefined;
}
