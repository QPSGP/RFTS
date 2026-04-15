import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { getMemberActivityLog, getMemberActivityLogForUser, getUserByEmail } from "@/lib/db";

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const email = new URL(request.url).searchParams.get("email")?.trim();
  if (email) {
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }
    const result = await getMemberActivityLogForUser(user.id, 150);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, activityLog: [] },
        { status: 503 }
      );
    }
    return NextResponse.json({ activityLog: result.entries });
  }
  const result = await getMemberActivityLog(100);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, activityLog: [] },
      { status: 503 }
    );
  }
  return NextResponse.json({ activityLog: result.entries });
}
