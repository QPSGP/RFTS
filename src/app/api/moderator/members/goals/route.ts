import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserByEmail, getUserProfile, setUserGoals } from "@/lib/db";
import { requireModeratorAssignedMember } from "@/lib/moderator-member-access";

const patchSchema = z.object({
  email: z.string().email(),
  goalIds: z.array(z.string()).max(10)
});

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const access = await requireModeratorAssignedMember(parsed.data.email);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const user = await getUserByEmail(access.memberEmail);
  if (!user) {
    return NextResponse.json({ error: "Member not registered yet." }, { status: 404 });
  }

  const profile = await getUserProfile(access.memberEmail);
  if (profile?.subscriptionTier === "platinum_managed") {
    return NextResponse.json(
      { error: "Platinum Managed members use rotation order instead of goals." },
      { status: 400 }
    );
  }

  await setUserGoals(user.id, parsed.data.goalIds);

  return NextResponse.json({
    ok: true,
    goalIds: parsed.data.goalIds
  });
}
