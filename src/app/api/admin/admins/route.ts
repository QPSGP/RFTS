import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createAdmin, getFirstAdminEmail, listAdmins } from "@/lib/db";
import { getSessionEmail, isAdminSession } from "@/lib/auth";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const email = getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const firstAdminEmail = await getFirstAdminEmail();
  if (!firstAdminEmail || email.toLowerCase() !== firstAdminEmail.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden. First admin only." }, { status: 403 });
  }
  const admins = await listAdmins();
  return NextResponse.json({ admins });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const email = getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const firstAdminEmail = await getFirstAdminEmail();
  if (!firstAdminEmail || email.toLowerCase() !== firstAdminEmail.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden. First admin only." }, { status: 403 });
  }
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await createAdmin(parsed.data.email, passwordHash);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create admin." },
      { status: 500 }
    );
  }
}
