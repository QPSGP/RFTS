import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAffiliatePayoutThresholdUsd } from "@/lib/affiliate-payout";
import { isAdminSession } from "@/lib/auth";
import { listAffiliatePayoutSummaries, markAffiliateCommissionsPaid } from "@/lib/db";
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

const markPaidSchema = z.object({
  affiliateCode: z.string().min(3),
  payoutNotes: z.string().max(500).optional()
});

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = markPaidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const markedCount = await markAffiliateCommissionsPaid(
    parsed.data.affiliateCode,
    parsed.data.payoutNotes
  );
  if (markedCount === 0) {
    return NextResponse.json({ error: "No pending commissions for this affiliate." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, markedCount });
}
