/** Keep Stripe return paths on this site. */
export function safeReturnPath(path: string | undefined, fallback = "/"): string {
  if (!path) return fallback;
  const value = path.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || value.includes("://") || value.includes("@")) return fallback;
  if (value.includes("\n") || value.includes("\r")) return fallback;
  return value.slice(0, 200);
}
