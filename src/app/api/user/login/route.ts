import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserByEmail, recordMemberActivity } from "@/lib/db";
import { buildMemberSessionSetCookieHeader, createUserSessionToken } from "@/lib/user-auth";

/** Login: JSON only. Success = 200 + Set-Cookie (never 302 — browsers often don't set cookie on redirect). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const e = body?.email;
  const p = body?.password;
  if (typeof e !== "string" || typeof p !== "string" || !e.trim()) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  if (p.length < 6) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  const email = e.trim();
  const password = p;

  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = createUserSessionToken(user.email);
  await recordMemberActivity(user.id, "login");

  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildMemberSessionSetCookieHeader(token));
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}
