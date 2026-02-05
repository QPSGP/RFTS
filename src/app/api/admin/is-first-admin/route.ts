import { NextResponse } from "next/server";
import { getFirstAdminEmail } from "@/lib/db";
import { getSessionEmail, isAdminSession } from "@/lib/auth";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ isFirstAdmin: false });
  }
  const email = getSessionEmail();
  if (!email) {
    return NextResponse.json({ isFirstAdmin: false });
  }
  const firstAdminEmail = await getFirstAdminEmail();
  const isFirstAdmin =
    !!firstAdminEmail && email.toLowerCase() === firstAdminEmail.toLowerCase();
  return NextResponse.json({ isFirstAdmin });
}
