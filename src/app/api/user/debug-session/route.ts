import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserSessionEmail } from "@/lib/user-auth";

const sessionCookie = "rfts_user_session";

/** Temporary: check if the member session cookie is present and verifies. Remove after fixing login. */
export async function GET() {
  const cookieStore = await cookies();
  const value = cookieStore.get(sessionCookie)?.value ?? null;
  let tokenParts = 0;
  if (value) {
    let token = value;
    try {
      token = decodeURIComponent(token);
    } catch {
      // leave as-is
    }
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    token = token.replace(/ /g, "+");
    tokenParts = token.split("|").length;
  }
  const email = await getUserSessionEmail();
  return NextResponse.json({
    cookiePresent: !!value,
    tokenParts,
    sessionValid: !!email
  });
}
