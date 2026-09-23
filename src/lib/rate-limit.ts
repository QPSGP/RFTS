/**
 * Shared rate limiter. Postgres keeps one counter across serverless instances.
 * If the database is unavailable, this falls back to process memory.
 */

import { sql } from "@vercel/postgres";
import { ensureAuthHardeningSchema } from "@/lib/auth-sessions";

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 10;

const store = new Map<string, number[]>();

function prune(key: string, now: number) {
  const timestamps = store.get(key);
  if (!timestamps) return;
  const cutoff = now - WINDOW_MS;
  const kept = timestamps.filter((t) => t > cutoff);
  if (kept.length === 0) store.delete(key);
  else store.set(key, kept);
}

function memoryRateLimit(key: string, maxPerWindow: number): boolean {
  const now = Date.now();
  prune(key, now);
  const timestamps = store.get(key) ?? [];
  if (timestamps.length >= maxPerWindow) return false;
  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}

/**
 * Check if the key is over the limit. If not, record the request and return true.
 * If over limit, return false.
 */
export async function rateLimit(
  key: string,
  maxPerWindow: number = MAX_PER_WINDOW
): Promise<boolean> {
  try {
    await ensureAuthHardeningSchema();
    const { rows } = await sql<{ hits: number }>`
      INSERT INTO request_rate_limits (bucket, hits, window_start)
      VALUES (${key}, 1, now())
      ON CONFLICT (bucket) DO UPDATE
      SET
        hits = CASE
          WHEN request_rate_limits.window_start < now() - interval '1 minute' THEN 1
          ELSE request_rate_limits.hits + 1
        END,
        window_start = CASE
          WHEN request_rate_limits.window_start < now() - interval '1 minute' THEN now()
          ELSE request_rate_limits.window_start
        END
      RETURNING hits
    `;
    return (rows[0]?.hits ?? 1) <= maxPerWindow;
  } catch (error) {
    console.error("[rate-limit] database counter failed; using memory", error);
    return memoryRateLimit(key, maxPerWindow);
  }
}

/**
 * Client IP from the platform headers. Prefer x-real-ip. The last
 * X-Forwarded-For hop is the one a proxy appended, not a value the client set first.
 */
export function getClientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const vercel = request.headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const parts = vercel.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}
