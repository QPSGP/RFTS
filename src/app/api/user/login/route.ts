import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { apiError } from "@/lib/api-utils";
import { getUserByEmail, normalizeMemberEmail, recordMemberActivity } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createUserSessionToken, setUserSessionCookieOnResponse } from "@/lib/user-auth";

const LOGIN_MAX_PER_MINUTE = 60;

function safeMemberNextPath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const p = raw.trim();
  if (!p.startsWith("/") || p.startsWith("//")) return null;
  if (p.includes("\n") || p.includes("\r") || p.includes("<")) return null;
  return p.slice(0, 240);
}

export async function POST(request: Request) {
  try {
    return await doPost(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/user/login]", message);
    return apiError("Server error.", 500, message);
  }
}

async function doPost(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`login:${ip}`, LOGIN_MAX_PER_MINUTE)) {
    return apiError("Too many login attempts. Please try again in a minute.", 429);
  }

  const baseUrl = new URL(request.url).origin;
  const loginErrorUrl = `${baseUrl}/member/login?error=invalid`;
  const successUrl = `${baseUrl}/play-options`;

  let email: string;
  let password: string;
  let loginDetails: string | null = null;

  const contentType = request.headers.get("content-type") || "";
  const isFormLogin = contentType.includes("application/x-www-form-urlencoded");
  if (isFormLogin) {
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
    const nextPath = safeMemberNextPath(body?.next);
    loginDetails = nextPath ? `to:${nextPath}` : null;
  }

  const user = await getUserByEmail(email);
  if (!user) {
    if (!isFormLogin) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }
    return NextResponse.redirect(loginErrorUrl, 302);
  }
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    if (!isFormLogin) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }
    return NextResponse.redirect(loginErrorUrl, 302);
  }

  const token = createUserSessionToken(normalizeMemberEmail(user.email));
  void recordMemberActivity(user.id, "login", loginDetails);

  if (isFormLogin) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${successUrl}"></head><body>Signed in. Taking you to Play Options…</body></html>`;
    const response = new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });
    setUserSessionCookieOnResponse(response, token, request);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  setUserSessionCookieOnResponse(response, token, request);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}

