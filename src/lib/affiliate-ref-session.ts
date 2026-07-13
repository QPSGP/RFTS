export const AFFILIATE_REF_SESSION_KEY = "rfts-affiliate-ref";

/** Read persisted affiliate ref (sessionStorage). Client only. */
export function readSessionAffiliateRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(AFFILIATE_REF_SESSION_KEY);
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

/** Persist affiliate ref for the browser session. Client only. */
export function writeSessionAffiliateRef(code: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(AFFILIATE_REF_SESSION_KEY, code);
  } catch {
    // ignore private mode / quota
  }
}
