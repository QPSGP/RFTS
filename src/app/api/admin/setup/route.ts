import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createAdmin, getAdminCount } from "@/lib/db";
import { NEW_PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { createSessionToken, setSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(NEW_PASSWORD_MIN_LENGTH),
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
  try {
    return NextResponse.json({ needsSetup: await needsSetup() });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error while checking setup."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await needsSetup())) {
      return NextResponse.json({ error: "Setup is already complete." }, { status: 409 });
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    const requiredToken = process.env.ADMIN_SETUP_TOKEN?.trim();
    if (!requiredToken || parsed.data.setupToken !== requiredToken) {
      return NextResponse.json({ error: "Invalid setup token." }, { status: 401 });
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await createAdmin(parsed.data.email, passwordHash);
    const token = await createSessionToken(parsed.data.email);
    setSession(token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin setup]", error);
    return NextResponse.json({ error: "Could not create the admin account." }, { status: 500 });
  }
}
