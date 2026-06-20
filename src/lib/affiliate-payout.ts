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
