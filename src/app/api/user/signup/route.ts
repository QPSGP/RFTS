import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createUser, ensureSubscription, getUserByEmail, normalizeMemberEmail } from "@/lib/db";
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
  const existing = await getUserByEmail(parsed.data.email);
  if (existing) {
    return NextResponse.json({ error: "Account already exists." }, { status: 409 });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await createUser(parsed.data.email, passwordHash);
  await ensureSubscription(user.id, "platinum", "inactive");
  const token = createUserSessionToken(normalizeMemberEmail(user.email));
  const response = NextResponse.json({ ok: true });
  setUserSessionCookieOnResponse(response, token, request);
  return response;
}
