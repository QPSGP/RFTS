import { NextResponse } from "next/server";
import { getSessionEmail, getSessionRole } from "@/lib/auth";

export async function GET() {
  const email = getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const role = await getSessionRole();
  if (!role) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ email, role });
}
