import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getUserByEmail, recordMemberActivity } from "@/lib/db";
import { createUserSessionToken, setUserSession } from "@/lib/user-auth";

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
  setUserSession(token);
  await recordMemberActivity(user.id, "login");
  return NextResponse.json({ ok: true });
}
