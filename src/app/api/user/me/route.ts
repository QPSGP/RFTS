import { NextResponse } from "next/server";
import { getUserSessionEmail } from "@/lib/user-auth";
import { getMemberProfileByUserId, getUserProfile } from "@/lib/db";

export async function GET() {
  try {
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
    const yearBornRaw = memberProfile?.yearBorn ?? null;
    const yearBorn =
      yearBornRaw != null
        ? typeof yearBornRaw === "number"
          ? yearBornRaw
          : parseInt(String(yearBornRaw), 10)
        : null;
    const yearBornNum =
      yearBorn != null && !Number.isNaN(yearBorn) && yearBorn >= 1900 && yearBorn <= 2100
        ? yearBorn
        : null;
    const currentYear = new Date().getFullYear();
    const hasVerifiedAge = yearBornNum != null && currentYear - yearBornNum >= 18;
    const storedConsent = memberProfile?.adultConsent ?? false;
    const adultConsent = storedConsent && hasVerifiedAge;
    const wantsPracticeGrowth = memberProfile?.wantsPracticeGrowth ?? false;
    const firstName = memberProfile?.firstName ?? null;
    const lastName = memberProfile?.lastName ?? null;
    const res = NextResponse.json({
      profile: {
        ...profile,
        firstName,
        lastName,
        adultConsent,
        yearBorn: yearBornNum,
        hasVerifiedAge,
        wantsPracticeGrowth
      }
    });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/user/me]", message);
    return NextResponse.json({ error: "Server error.", detail: message }, { status: 500 });
  }
}
