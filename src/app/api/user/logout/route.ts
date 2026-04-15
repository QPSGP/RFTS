import { NextResponse } from "next/server";
import { getUserByEmail, recordMemberActivity } from "@/lib/db";
import { clearUserSession, getUserSessionEmail } from "@/lib/user-auth";

export async function POST() {
  const email = await getUserSessionEmail();
  const hadSession = email != null;
  if (email) {
    const user = await getUserByEmail(email);
    if (user) {
      await recordMemberActivity(user.id, "logout");
    }
  }
  await clearUserSession();
  return NextResponse.json({ ok: true, cleared: hadSession });
}
