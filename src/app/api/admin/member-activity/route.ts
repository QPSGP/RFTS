import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { getMemberActivityLog } from "@/lib/db";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const activityLog = await getMemberActivityLog(100);
  return NextResponse.json({ activityLog });
}
