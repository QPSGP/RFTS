import { NextResponse } from "next/server";
import { clearSession, revokeCurrentStaffSession } from "@/lib/auth";

export async function POST() {
  await revokeCurrentStaffSession();
  clearSession();
  return NextResponse.json({ ok: true });
}
