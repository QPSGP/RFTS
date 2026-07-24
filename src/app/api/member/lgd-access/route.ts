import { NextResponse } from "next/server";
import { getUserSessionEmail } from "@/lib/user-auth";
import { getMemberProfileByUserId, getUserProfile } from "@/lib/db";
import {
  getLgdFlagsForMemberEmail,
  getLgdPriceDisplay,
  isLgdAdminOnlyMode
} from "@/lib/lgd-access";

/** Lightweight flags/price for console CTAs (does not create an intake draft). */
export async function GET() {
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const user = await getUserProfile(email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (isLgdAdminOnlyMode()) {
    return NextResponse.json({
      hadLgdSession: false,
      adminOnly: true,
      electronicIntakeEnabled: false,
      consoleOffer: false,
      priceLabel: getLgdPriceDisplay().label,
      priceCents: getLgdPriceDisplay().priceCents
    });
  }
  const memberProfile = await getMemberProfileByUserId(user.id);
  const { flags } = await getLgdFlagsForMemberEmail(email);
  const price = getLgdPriceDisplay();
  return NextResponse.json({
    hadLgdSession: memberProfile?.hadLgdSession ?? false,
    flags,
    priceLabel: price.label,
    priceCents: price.priceCents,
    electronicIntakeEnabled: flags.lgdElectronicIntake,
    consoleOffer: flags.lgdMemberConsoleOffer && flags.lgdElectronicIntake
  });
}
