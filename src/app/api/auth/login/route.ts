import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  setSession,
  verifyAdminCredentials,
  verifyModeratorCredentials
} from "@/lib/auth";
import { getModeratorByEmail, recordStaffActivity } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const STAFF_LOGIN_MAX_PER_MINUTE = 10;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!(await rateLimit(`staff-login:${ip}`, STAFF_LOGIN_MAX_PER_MINUTE))) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again in a minute." },
      { status: 429 }
    );
  }
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
  const token = await createSessionToken(email);
  setSession(token);

  const actorType = isAdmin ? "admin" : "moderator";
  const moderator = isModerator ? await getModeratorByEmail(email) : null;
  await recordStaffActivity(actorType, email, "login", moderator?.name ?? null);

  return NextResponse.json({ ok: true, role: isAdmin ? "admin" : "moderator" });
}
