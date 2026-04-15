import { NextResponse } from "next/server";
import { buildMemberSessionSetCookieHeader, createUserSessionToken, verifyOneTimeSessionToken } from "@/lib/user-auth";

/** Exchange one-time token (from login) for session cookie. Call from play-options so cookie is set from that origin. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token.trim() : null;
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }
  const email = verifyOneTimeSessionToken(token);
  if (!email) {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }
  const sessionToken = createUserSessionToken(email);
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildMemberSessionSetCookieHeader(sessionToken, request));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
