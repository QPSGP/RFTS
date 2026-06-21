import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { runAllReadyStripeConnectPayouts } from "@/lib/stripe-connect";

/**
 * Monthly Stripe Connect affiliate payouts (Vercel Cron: 1st of month, 14:00 UTC).
 * Secured with CRON_SECRET (Bearer token from Vercel Cron).
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const results = await runAllReadyStripeConnectPayouts();
  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const totalPaidCents = succeeded.reduce((sum, r) => sum + (r.amountCents ?? 0), 0);

  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    attempted: results.length,
    succeededCount: succeeded.length,
    failedCount: failed.length,
    totalPaidCents,
    results
  };

  console.info("[cron affiliate-connect-payouts]", JSON.stringify({
    attempted: summary.attempted,
    succeededCount: summary.succeededCount,
    failedCount: summary.failedCount,
    totalPaidCents: summary.totalPaidCents
  }));

  return NextResponse.json({ ok: true, ...summary });
}
