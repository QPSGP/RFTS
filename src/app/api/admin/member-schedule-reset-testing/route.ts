import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import {
  adminBumpPlaybackInitialTracksToStandardIfLow,
  adminResetMemberScheduleAnchorForTesting,
  getUserByEmail,
  recordMemberActivity
} from "@/lib/db";

const bodySchema = z.object({
  email: z.string().email(),
  /** When true (default), set global playback `initial_tracks` to 4 if it is still below 4. */
  bumpInitialTracks: z.boolean().optional()
});

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const bumpInitialTracks = parsed.data.bumpInitialTracks !== false;
  const user = await getUserByEmail(parsed.data.email.trim());
  if (!user) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const anchor = await adminResetMemberScheduleAnchorForTesting(user.id);
  if (!anchor.ok) {
    return NextResponse.json({ error: anchor.error }, { status: 400 });
  }

  let playback: { initialTracks: number; changed: boolean } | null = null;
  if (bumpInitialTracks) {
    const bump = await adminBumpPlaybackInitialTracksToStandardIfLow();
    if (!bump.ok) {
      return NextResponse.json({ error: bump.error }, { status: 400 });
    }
    playback = { initialTracks: bump.initialTracks, changed: bump.changed };
  }

  await recordMemberActivity(
    user.id,
    "admin_schedule_testing_reset",
    playback
      ? `Schedule anchor cleared; playback initial_tracks now ${playback.initialTracks}${playback.changed ? " (was below 4)" : ""}`
      : "Schedule anchor cleared (completed nights 0, rotation start cleared)"
  );

  return NextResponse.json({
    ok: true,
    completedScheduleNights: 0,
    scheduleStartedAt: null,
    currentNight: 1,
    playback
  });
}
