import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getUserByEmail, recordMemberActivity } from "@/lib/db";
import { createUserSessionToken, setUserSessionCookieOnResponse } from "@/lib/user-auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const user = await getUserByEmail(parsed.data.email);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  const isValid = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  const token = createUserSessionToken(user.email);
  await recordMemberActivity(user.id, "login");
  const baseUrl = new URL(request.url).origin;
  const response = NextResponse.redirect(`${baseUrl}/play-options`, 302);
  setUserSessionCookieOnResponse(response, token);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}
