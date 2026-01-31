import { NextResponse } from "next/server";
import { clearUserSession } from "@/lib/user-auth";

export async function POST() {
  clearUserSession();
  return NextResponse.json({ ok: true });
}
