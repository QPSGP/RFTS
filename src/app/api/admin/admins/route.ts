import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  createAdmin,
  getFirstAdminEmail,
  listAdmins,
  updateAdminByEmail
} from "@/lib/db";
import { getSessionEmail, isAdminSession } from "@/lib/auth";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional()
});

const patchSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(6).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional()
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
  return NextResponse.json({ admins, primaryAdminEmail: firstAdminEmail });
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
    await createAdmin(parsed.data.email, passwordHash, {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create admin." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const sessionEmail = getSessionEmail();
  if (!sessionEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const firstAdminEmail = await getFirstAdminEmail();
  if (!firstAdminEmail || sessionEmail.toLowerCase() !== firstAdminEmail.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden. First admin only." }, { status: 403 });
  }
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { email, newPassword, firstName, lastName } = parsed.data;
  const hasPw = newPassword !== undefined && newPassword.length >= 6;
  const hasFn = firstName !== undefined;
  const hasLn = lastName !== undefined;
  if (!hasPw && !hasFn && !hasLn) {
    return NextResponse.json(
      { error: "Provide newPassword (6+ chars) and/or firstName and/or lastName." },
      { status: 400 }
    );
  }
  const passwordHash = hasPw ? await bcrypt.hash(newPassword, 10) : undefined;
  const ok = await updateAdminByEmail(email, {
    ...(passwordHash !== undefined ? { passwordHash } : {}),
    ...(hasFn ? { firstName: firstName ?? null } : {}),
    ...(hasLn ? { lastName: lastName ?? null } : {})
  });
  if (!ok) {
    return NextResponse.json({ error: "Admin not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
