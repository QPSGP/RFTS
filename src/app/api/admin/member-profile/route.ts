import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import {
  buildUpsertMemberProfilePayload,
  memberProfilePatchSchema
} from "@/lib/member-profile-form";
import { getMemberProfileByUserId, getUserByEmail, upsertMemberProfile } from "@/lib/db";

const querySchema = z.object({
  email: z.string().email()
});

const updateSchema = z.object({
  email: z.string().email(),
  profile: memberProfilePatchSchema
});

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ email: url.searchParams.get("email") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const user = await getUserByEmail(parsed.data.email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const profile = await getMemberProfileByUserId(user.id);
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const user = await getUserByEmail(parsed.data.email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const existing = await getMemberProfileByUserId(user.id);
  await upsertMemberProfile(
    buildUpsertMemberProfilePayload(user.id, existing, parsed.data.profile)
  );
  return NextResponse.json({ ok: true });
}
