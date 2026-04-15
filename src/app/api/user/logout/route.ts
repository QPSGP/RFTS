import { NextResponse } from "next/server";
import { getUserByEmail, recordMemberActivity } from "@/lib/db";
import { clearUserSession, getUserSessionEmail } from "@/lib/user-auth";

export async function POST(request: Request) {
  const email = await getUserSessionEmail();
  const hadSession = email != null;
  if (email) {
    const user = await getUserByEmail(email);
    if (user) {
      void recordMemberActivity(user.id, "logout").catch((err) => {
        console.error("[POST /api/user/logout] recordMemberActivity:", err);
      });
    }
  }
  await clearUserSession(request);
  return NextResponse.json({ ok: true, cleared: hadSession });
}
