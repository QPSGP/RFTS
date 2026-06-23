import { NextResponse } from "next/server";
import { z } from "zod";
import { getMemberAudioOrder } from "@/lib/db";
import { saveMemberAudioOrder } from "@/lib/member-audio-order";
import { requireModeratorAssignedMember } from "@/lib/moderator-member-access";
import { recordModeratorStaffActivity } from "@/lib/facilitator-staff-activity";

const querySchema = z.object({
  email: z.string().email()
});

const updateSchema = z.object({
  email: z.string().email(),
  order: z.array(z.string().uuid())
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
  const order = await getMemberAudioOrder(access.memberEmail);
  return NextResponse.json({ order });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const access = await requireModeratorAssignedMember(parsed.data.email);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const result = await saveMemberAudioOrder(access.memberEmail, parsed.data.order);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  await recordModeratorStaffActivity(
    `updated_member_rotation:${access.memberEmail}:${parsed.data.order.length}`
  );
  return NextResponse.json({ success: true });
}
