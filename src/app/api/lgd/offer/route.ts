import { NextResponse } from "next/server";
import { getPublicLgdOfferEnabled, getLgdPriceDisplay } from "@/lib/lgd-access";

/** Public: whether to show Life Guidance Discovery marketing CTAs. */
export async function GET() {
  const enabled = await getPublicLgdOfferEnabled();
  const price = getLgdPriceDisplay();
  return NextResponse.json({
    publicOffer: enabled,
    priceLabel: price.label,
    priceCents: price.priceCents
  });
}
