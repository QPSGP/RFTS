import { z } from "zod";

export const AFFILIATE_PAYOUT_METHODS = [
  "crypto",
  "paypal",
  "venmo",
  "zelle",
  "bank_contact"
] as const;

export type AffiliatePayoutMethod = (typeof AFFILIATE_PAYOUT_METHODS)[number];

export const AFFILIATE_PAYOUT_METHOD_LABELS: Record<AffiliatePayoutMethod, string> = {
  crypto: "Cryptocurrency",
  paypal: "PayPal",
  venmo: "Venmo",
  zelle: "Zelle",
  bank_contact: "Bank / ACH (contact support)"
};

export const AFFILIATE_PAYOUT_DETAIL_PLACEHOLDERS: Record<AffiliatePayoutMethod, string> = {
  crypto: "Crypto wallet address",
  paypal: "PayPal email",
  venmo: "Venmo username or phone",
  zelle: "Zelle email or phone",
  bank_contact: "Optional note (we will contact you for bank details)"
};

/** Launch-period minimum (USD); standard minimum applies after launch period ends. */
export const AFFILIATE_PAYOUT_THRESHOLD_LAUNCH_USD = 25;
export const AFFILIATE_PAYOUT_THRESHOLD_STANDARD_USD = 50;

const AFFILIATE_PAYOUT_LAUNCH_PERIOD_END_DEFAULT = "2027-06-18";

export function getAffiliatePayoutLaunchPeriodEnd(): Date {
  const raw =
    process.env.NEXT_PUBLIC_AFFILIATE_PAYOUT_LAUNCH_END ??
    AFFILIATE_PAYOUT_LAUNCH_PERIOD_END_DEFAULT;
  const datePart = raw.trim().slice(0, 10);
  return new Date(`${datePart}T23:59:59`);
}

export function isAffiliateLaunchPayoutPeriod(now = new Date()): boolean {
  return now <= getAffiliatePayoutLaunchPeriodEnd();
}

export function getCurrentAffiliatePayoutThresholdUsd(now = new Date()): number {
  return isAffiliateLaunchPayoutPeriod(now)
    ? AFFILIATE_PAYOUT_THRESHOLD_LAUNCH_USD
    : AFFILIATE_PAYOUT_THRESHOLD_STANDARD_USD;
}

export function formatAffiliatePayoutLaunchPeriodEndLabel(): string {
  return getAffiliatePayoutLaunchPeriodEnd().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

export function formatAffiliatePayoutThresholdPolicy(now = new Date()): string {
  const standard = AFFILIATE_PAYOUT_THRESHOLD_STANDARD_USD;
  if (!isAffiliateLaunchPayoutPeriod(now)) {
    return `Commissions are paid monthly when your balance reaches $${standard}. Amounts below that roll forward to the next month.`;
  }
  const launch = AFFILIATE_PAYOUT_THRESHOLD_LAUNCH_USD;
  const endLabel = formatAffiliatePayoutLaunchPeriodEndLabel();
  return `Commissions are paid monthly when your balance reaches the minimum threshold. During our launch period (through ${endLabel}), the minimum is $${launch}; after that, the minimum becomes $${standard}. Amounts below the minimum roll forward.`;
}

export function formatAffiliatePayoutShortSummary(now = new Date()): string {
  const threshold = getCurrentAffiliatePayoutThresholdUsd(now);
  return `Monthly payouts when your balance reaches $${threshold} (manual processing).`;
}

export function normalizeAffiliatePayoutMethod(
  raw: string | null | undefined
): AffiliatePayoutMethod | null {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return null;
  return AFFILIATE_PAYOUT_METHODS.includes(value as AffiliatePayoutMethod)
    ? (value as AffiliatePayoutMethod)
    : null;
}

export function formatAffiliatePayoutMethodLabel(method: string | null | undefined): string {
  const normalized = normalizeAffiliatePayoutMethod(method);
  if (!normalized) return "Not set";
  return AFFILIATE_PAYOUT_METHOD_LABELS[normalized];
}

export const affiliatePayoutInputSchema = z
  .object({
    payoutMethod: z.enum(AFFILIATE_PAYOUT_METHODS),
    payoutDetail: z.string().trim().max(500).optional()
  })
  .superRefine((data, ctx) => {
    const detail = data.payoutDetail?.trim() || "";
    if (data.payoutMethod === "bank_contact") return;
    if (detail.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payout details are required for this method.",
        path: ["payoutDetail"]
      });
    }
  });

export function parseAffiliatePayoutInput(input: {
  payoutMethod: string;
  payoutDetail?: string | null;
}) {
  return affiliatePayoutInputSchema.safeParse({
    payoutMethod: input.payoutMethod,
    payoutDetail: input.payoutDetail ?? ""
  });
}
