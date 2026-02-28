import { NextResponse } from "next/server";
import { clearUserSession, getUserSessionEmail } from "@/lib/user-auth";

export async function POST() {
  const hadSession = (await getUserSessionEmail()) != null;
  await clearUserSession();
  return NextResponse.json({ ok: true, cleared: hadSession });
}
