/** Google Analytics 4 measurement ID. Override with NEXT_PUBLIC_GA_MEASUREMENT_ID. */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-LE8W4KTMLK";

/** Set NEXT_PUBLIC_GA_ENABLED=false to disable the tracking script (e.g. local). */
export function isGoogleAnalyticsEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_GA_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return false;
  return Boolean(GA_MEASUREMENT_ID);
}

type GtagFn = (...args: unknown[]) => void;

/** Custom GA4 event (no-op when gtag is not loaded). */
export function trackGaEvent(name: string, params?: Record<string, string>): void {
  if (typeof window === "undefined") return;
  const gtag = (window as Window & { gtag?: GtagFn }).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", name, params);
}
