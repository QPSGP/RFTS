import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { getMemberActivityAnalytics } from "@/lib/db";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { summary, members } = await getMemberActivityAnalytics();
  return NextResponse.json({ summary, members });
}
