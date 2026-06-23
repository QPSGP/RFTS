import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getPlaybackSettings,
  getUserByEmail,
  getUserProfile,
  listInterests,
  listLibrary
} from "@/lib/db";
import { requireActiveModerator } from "@/lib/moderator-member-access";
import { buildSchedulePreview } from "@/lib/scheduler";

const querySchema = z.object({
  email: z.string().email(),
  nights: z.string().optional()
});

export async function GET(request: Request) {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    email: url.searchParams.get("email"),
    nights: url.searchParams.get("nights")
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const normalized = parsed.data.email.trim().toLowerCase();
  const allowed = moderator.assignedUserEmails.map((e) => e.trim().toLowerCase());
  if (!allowed.includes(normalized)) {
    return NextResponse.json({ error: "This member is not assigned to you." }, { status: 403 });
  }

  const memberEmail = normalized;
  const user = await getUserByEmail(memberEmail);
  if (!user) {
    return NextResponse.json({ error: "Member not registered yet." }, { status: 404 });
  }

  const profile = await getUserProfile(memberEmail);
  if (profile?.subscriptionTier === "platinum_managed") {
    return NextResponse.json(
      { error: "Platinum Managed members use rotation order instead of goal-based schedule." },
      { status: 400 }
    );
  }

  const goalIds = profile?.goalIds ?? [];
  if (goalIds.length === 0) {
    return NextResponse.json({
      schedule: [],
      message: "No goals assigned yet — add goals to preview the nightly schedule."
    });
  }

  let nights = 14;
  if (parsed.data.nights) {
    const n = parseInt(parsed.data.nights, 10);
    if (Number.isFinite(n)) nights = Math.min(30, Math.max(1, n));
  }

  const playsPerNight =
    profile?.playsPerNight === 1 ? 1 : (2 as 1 | 2);

  const [library, settings, interestRecords] = await Promise.all([
    listLibrary(),
    getPlaybackSettings(),
    listInterests()
  ]);

  const schedule = buildSchedulePreview({
    interests: goalIds,
    library,
    interestRecords,
    settings,
    tier: "platinum",
    nights,
    playsPerNight
  });

  return NextResponse.json({ schedule, nights, goalCount: goalIds.length });
}
