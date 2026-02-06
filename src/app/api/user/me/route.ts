import { NextResponse } from "next/server";
import { getUserSessionEmail } from "@/lib/user-auth";
import { getMemberProfileByUserId, getUserProfile } from "@/lib/db";

export async function GET() {
  const email = getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const memberProfile = await getMemberProfileByUserId(profile.id);
  const adultConsent = memberProfile?.adultConsent ?? false;
  return NextResponse.json({
    profile: { ...profile, adultConsent }
  });
}
