import { NextResponse } from "next/server";
import { z } from "zod";
import { requireModeratorAssignedMember } from "@/lib/moderator-member-access";
import { getMemberProfileByUserId, getUserByEmail, getUserProfile } from "@/lib/db";

const querySchema = z.object({
  email: z.string().email()
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ email: url.searchParams.get("email") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  const access = await requireModeratorAssignedMember(parsed.data.email);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const user = await getUserByEmail(access.memberEmail);
  if (!user) {
    return NextResponse.json({
      member: {
        email: access.memberEmail,
        registered: false
      }
    });
  }
  const profile = await getUserProfile(access.memberEmail);
  const memberProfile = await getMemberProfileByUserId(user.id);
  return NextResponse.json({
    member: {
      email: user.email,
      registered: true,
      subscriptionTier: profile?.subscriptionTier ?? null,
      subscriptionStatus: profile?.subscriptionStatus ?? null,
      goalIds: profile?.goalIds ?? [],
      playsPerNight: profile?.playsPerNight ?? 2,
      profile: memberProfile
    }
  });
}
