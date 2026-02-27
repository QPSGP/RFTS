import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserByEmail, recordMemberActivity } from "@/lib/db";
import { createUserSessionToken, setUserSessionCookieOnResponse } from "@/lib/user-auth";

/**
 * Login: form POST → 302 redirect to /play-options with Set-Cookie (so cookie is sent on the next request).
 * JSON POST still supported for API clients (200 + Set-Cookie, no redirect).
 */
export async function POST(request: Request) {
  const baseUrl = new URL(request.url).origin;
  const loginErrorUrl = `${baseUrl}/member/login?error=invalid`;
  const successUrl = `${baseUrl}/play-options`;

  let email: string;
  let password: string;
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    const e = formData.get("email");
    const p = formData.get("password");
    if (typeof e !== "string" || typeof p !== "string" || !e.trim()) {
      return NextResponse.redirect(loginErrorUrl, 302);
    }
    if (p.length < 6) {
      return NextResponse.redirect(loginErrorUrl, 302);
    }
    email = e.trim();
    password = p;
  } else {
    const body = await request.json().catch(() => ({}));
    const e = body?.email;
    const p = body?.password;
    if (typeof e !== "string" || typeof p !== "string" || !e.trim()) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    if (p.length < 6) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }
    email = e.trim();
    password = p;
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return contentType.includes("application/x-www-form-urlencoded")
      ? NextResponse.redirect(loginErrorUrl, 302)
      : NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return contentType.includes("application/x-www-form-urlencoded")
      ? NextResponse.redirect(loginErrorUrl, 302)
      : NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = createUserSessionToken(user.email);
  await recordMemberActivity(user.id, "login");

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const response = NextResponse.redirect(successUrl, 302);
    setUserSessionCookieOnResponse(response, token);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  }

  const response = NextResponse.json({ ok: true });
  setUserSessionCookieOnResponse(response, token);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}
