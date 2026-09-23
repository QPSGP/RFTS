import { NextResponse } from "next/server";

/** Retired. Session checks use /api/user/me. */
export async function GET() {
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
