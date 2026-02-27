import { NextResponse } from "next/server";
import { getUserSessionEmail } from "@/lib/user-auth";

/** Debug: is the member session cookie present and valid? Keep until we're sure login is stable. */
export async function GET() {
  const email = await getUserSessionEmail();
  return NextResponse.json({ sessionValid: !!email });
}
