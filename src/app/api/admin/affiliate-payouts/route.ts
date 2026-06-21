import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAffiliatePayoutThresholdUsd } from "@/lib/affiliate-payout";
import { isAdminSession } from "@/lib/auth";
import { listAffiliatePayoutSummaries, markAffiliateCommissionsPaid } from "@/lib/db";
import {
  runAllReadyStripeConnectPayouts,
  runStripeConnectPayoutForAffiliate
} from "@/lib/stripe-connect";
import type { AffiliatePayoutSummary } from "@/lib/types";

function enrichSummaries(
  rows: Awaited<ReturnType<typeof listAffiliatePayoutSummaries>>
): AffiliatePayoutSummary[] {
  const thresholdUsd = getCurrentAffiliatePayoutThresholdUsd();
  const thresholdCents = thresholdUsd * 100;
  return rows.map((row) => ({
    ...row,
    thresholdUsd,
    readyForPayout: row.pendingBalanceCents >= thresholdCents
  }));
}

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const rows = await listAffiliatePayoutSummaries();
  return NextResponse.json({
    summaries: enrichSummaries(rows),
    thresholdUsd: getCurrentAffiliatePayoutThresholdUsd()
  });
}

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("mark_paid"),
    affiliateCode: z.string().min(3),
    payoutNotes: z.string().max(500).optional()
  }),
  z.object({
    action: z.literal("run_connect"),
    affiliateCode: z.string().min(3).optional()
  })
]);

const legacyMarkPaidSchema = z.object({
  affiliateCode: z.string().min(3),
  payoutNotes: z.string().max(500).optional()
});

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    const legacy = legacyMarkPaidSchema.safeParse(body);
    if (!legacy.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    const markedCount = await markAffiliateCommissionsPaid(
      legacy.data.affiliateCode,
      legacy.data.payoutNotes
    );
    if (markedCount === 0) {
      return NextResponse.json({ error: "No pending commissions for this affiliate." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, markedCount });
  }

  if (parsed.data.action === "mark_paid") {
    const markedCount = await markAffiliateCommissionsPaid(
      parsed.data.affiliateCode,
      parsed.data.payoutNotes
    );
    if (markedCount === 0) {
      return NextResponse.json({ error: "No pending commissions for this affiliate." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, markedCount });
  }

  if (parsed.data.affiliateCode) {
    const result = await runStripeConnectPayoutForAffiliate(parsed.data.affiliateCode);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Connect payout failed." }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      transferId: result.transferId,
      amountCents: result.amountCents,
      markedCount: result.markedCount
    });
  }

  const results = await runAllReadyStripeConnectPayouts();
  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    ok: true,
    results,
    succeededCount: succeeded.length,
    failedCount: failed.length
  });
}
