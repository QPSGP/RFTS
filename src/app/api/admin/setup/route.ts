import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createAdmin, getAdminCount } from "@/lib/db";
import { createSessionToken, setSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  setupToken: z.string().optional()
});

const needsSetup = async () => {
  const envConfigured = process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH;
  if (envConfigured) {
    return false;
  }
  const count = await getAdminCount();
  return count === 0;
};

export async function GET() {
  return NextResponse.json({ needsSetup: await needsSetup() });
}

export async function POST(request: Request) {
  if (!(await needsSetup())) {
    return NextResponse.json({ error: "Setup is already complete." }, { status: 409 });
  }
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const requiredToken = process.env.ADMIN_SETUP_TOKEN;
  if (requiredToken && parsed.data.setupToken !== requiredToken) {
    return NextResponse.json({ error: "Invalid setup token." }, { status: 401 });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await createAdmin(parsed.data.email, passwordHash);
  const token = createSessionToken(parsed.data.email);
  setSession(token);
  return NextResponse.json({ ok: true });
}
