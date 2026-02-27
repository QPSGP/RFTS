import { NextResponse } from "next/server";
import { getUserSessionEmail } from "@/lib/user-auth";
import { getMemberProfileByUserId, getUserProfile } from "@/lib/db";

export async function GET() {
  const email = await getUserSessionEmail();
  if (!email) {
    const res = NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const memberProfile = await getMemberProfileByUserId(profile.id);
  const yearBorn = memberProfile?.yearBorn ?? null;
  const currentYear = new Date().getFullYear();
  const hasVerifiedAge = yearBorn != null && currentYear - yearBorn >= 18;
  const storedConsent = memberProfile?.adultConsent ?? false;
  const adultConsent = storedConsent && hasVerifiedAge;
  const wantsPracticeGrowth = memberProfile?.wantsPracticeGrowth ?? false;
  const res = NextResponse.json({
    profile: { ...profile, adultConsent, yearBorn, hasVerifiedAge, wantsPracticeGrowth }
  });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}
