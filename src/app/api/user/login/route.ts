import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserByEmail, recordMemberActivity } from "@/lib/db";
import { createUserSessionToken, setUserSessionCookieOnResponse } from "@/lib/user-auth";

export async function POST(request: Request) {
  const baseUrl = new URL(request.url).origin;
  const loginErrorUrl = `${baseUrl}/member/login?error=invalid`;

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

  const isForm = contentType.includes("application/x-www-form-urlencoded");
  const user = await getUserByEmail(email);
  if (!user) {
    return isForm ? NextResponse.redirect(loginErrorUrl, 302) : NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return isForm ? NextResponse.redirect(loginErrorUrl, 302) : NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = createUserSessionToken(user.email);
  await recordMemberActivity(user.id, "login");

  if (isForm) {
    const response = NextResponse.redirect(new URL("/play-options", request.url), 302);
    setUserSessionCookieOnResponse(response, token);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  setUserSessionCookieOnResponse(response, token);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}
