import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  setSession,
  verifyAdminCredentials,
  verifyModeratorCredentials
} from "@/lib/auth";

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
  const { email, password } = parsed.data;
  const isAdmin = await verifyAdminCredentials(email, password);
  const isModerator = isAdmin ? false : await verifyModeratorCredentials(email, password);
  if (!isAdmin && !isModerator) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  const token = createSessionToken(email);
  setSession(token);
  return NextResponse.json({ ok: true, role: isAdmin ? "admin" : "moderator" });
}
