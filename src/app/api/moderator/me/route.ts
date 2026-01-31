import { NextResponse } from "next/server";
import { getSessionEmail, getSessionRole } from "@/lib/auth";
import { findModeratorByEmail } from "@/lib/storage";

export async function GET() {
  if (getSessionRole() !== "moderator") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const email = getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const moderator = findModeratorByEmail(email);
  if (!moderator) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({
    moderator: {
      name: moderator.name,
      email: moderator.email,
      assignedUserEmails: moderator.assignedUserEmails,
      status: moderator.status
    }
  });
}
