import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import {
  getFacilitatorsForMemberEmail,
  getUserByEmail,
  listModerators,
  setMemberFacilitatorAssignment
} from "@/lib/db";

const patchSchema = z.object({
  memberEmail: z.string().email(),
  moderatorId: z.string().uuid().nullable()
});

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const email = new URL(request.url).searchParams.get("email")?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email required." }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const assigned = await getFacilitatorsForMemberEmail(user.email);
  const moderators = await listModerators();

  return NextResponse.json({
    memberEmail: user.email,
    assignedModeratorIds: assigned.map((m) => m.id),
    assignedFacilitators: assigned.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      status: m.status
    })),
    moderators: moderators.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      status: m.status
    }))
  });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const user = await getUserByEmail(parsed.data.memberEmail);
  if (!user) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  if (parsed.data.moderatorId) {
    const moderators = await listModerators();
    const facilitator = moderators.find((m) => m.id === parsed.data.moderatorId);
    if (!facilitator) {
      return NextResponse.json({ error: "Facilitator not found." }, { status: 404 });
    }
  }

  const assigned = await setMemberFacilitatorAssignment(
    user.email,
    parsed.data.moderatorId
  );

  return NextResponse.json({
    ok: true,
    assignedModeratorIds: assigned.map((m) => m.id),
    assignedFacilitators: assigned.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      status: m.status
    }))
  });
}
