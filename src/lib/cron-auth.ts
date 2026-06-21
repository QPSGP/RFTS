/**
 * Verifies scheduled job requests (Vercel Cron sends Authorization: Bearer CRON_SECRET).
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) {
    return true;
  }
  const header = request.headers.get("x-cron-secret");
  return header === secret;
}
