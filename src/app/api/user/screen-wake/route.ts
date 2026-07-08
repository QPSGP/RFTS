import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile, getUserScreenWakeEnabled, setUserScreenWakeEnabled } from "@/lib/db";
import { getUserSessionEmail } from "@/lib/user-auth";

const putSchema = z.object({
  enabled: z.boolean()
});

export async function GET() {
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const res = NextResponse.json({
    screenWakeEnabled: await getUserScreenWakeEnabled(profile.id)
  });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

export async function PUT(request: Request) {
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  await setUserScreenWakeEnabled(profile.id, parsed.data.enabled);
  const res = NextResponse.json({ screenWakeEnabled: parsed.data.enabled });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}
