/**
 * Simple in-memory rate limiter. Limits requests per key (e.g. IP) per window.
 * Note: In serverless (Vercel), each instance has its own memory, so limits
 * are per-instance. For production at scale, use Redis/Vercel KV or Upstash.
 */

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_PER_WINDOW = 10; // e.g. 10 login/signup/forgot-password attempts per minute per IP

const store = new Map<string, number[]>();

function prune(key: string, now: number) {
  const timestamps = store.get(key);
  if (!timestamps) return;
  const cutoff = now - WINDOW_MS;
  const kept = timestamps.filter((t) => t > cutoff);
  if (kept.length === 0) store.delete(key);
  else store.set(key, kept);
}

/**
 * Check if the key (e.g. IP) is over the limit. If not, record the request and return true.
 * If over limit, return false.
 */
export function rateLimit(key: string, maxPerWindow: number = MAX_PER_WINDOW): boolean {
  const now = Date.now();
  prune(key, now);
  const timestamps = store.get(key) ?? [];
  if (timestamps.length >= maxPerWindow) return false;
  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}

/**
 * Get client IP from request (Vercel: x-forwarded-for or x-real-ip).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
