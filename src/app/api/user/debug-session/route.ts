import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const sessionCookie = "rfts_user_session";

/** Temporary: check if the member session cookie is present and parseable. Remove after fixing login. */
export async function GET() {
  const cookieStore = await cookies();
  const value = cookieStore.get(sessionCookie)?.value ?? null;
  let tokenParts = 0;
  if (value) {
    let token = value;
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    tokenParts = token.split("|").length;
  }
  return NextResponse.json({
    cookiePresent: !!value,
    tokenParts
  });
}
