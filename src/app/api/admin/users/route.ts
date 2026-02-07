import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sql } from "@vercel/postgres";
import { isAdminSession } from "@/lib/auth";
import {
  createUser,
  deleteUserByEmail,
  ensureSubscription,
  getUserByEmail,
  getUserProfile,
  listUsers,
  setUserGoals,
  setUserPlaysPerNight
} from "@/lib/db";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tier: z.enum(["bronze", "gold", "platinum"]).default("platinum"),
  status: z.enum(["inactive", "active", "past_due", "canceled"]).default("inactive"),
  playsPerNight: z.number().int().min(1).max(2).optional()
});

const updateSchema = z.object({
  email: z.string().email(),
  tier: z.enum(["bronze", "gold", "platinum"]).optional(),
  status: z.enum(["inactive", "active", "past_due", "canceled"]).optional(),
  goalIds: z.array(z.string()).max(10).optional(),
  playsPerNight: z.number().int().min(1).max(2).optional(),
  resetPassword: z.string().min(6).optional()
});

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const users = await listUsers();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    const existing = await getUserByEmail(parsed.data.email);
    if (existing) {
      return NextResponse.json({ error: "User already exists." }, { status: 409 });
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const user = await createUser(parsed.data.email, passwordHash);
    await ensureSubscription(user.id, parsed.data.tier, parsed.data.status);
    if (parsed.data.playsPerNight) {
      await setUserPlaysPerNight(user.id, parsed.data.playsPerNight);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Member create failed."
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const user = await getUserByEmail(parsed.data.email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const profile = await getUserProfile(parsed.data.email);
  const tier = parsed.data.tier ?? profile?.subscriptionTier ?? "platinum";
  const status = parsed.data.status ?? profile?.subscriptionStatus ?? "inactive";
  await ensureSubscription(user.id, tier, status);
  if (parsed.data.goalIds) {
    await setUserGoals(user.id, parsed.data.goalIds);
  }
  if (parsed.data.playsPerNight) {
    await setUserPlaysPerNight(user.id, parsed.data.playsPerNight);
  }
  if (parsed.data.resetPassword) {
    const passwordHash = await bcrypt.hash(parsed.data.resetPassword, 10);
    await sql`
      UPDATE users
      SET password_hash = ${passwordHash}
      WHERE id = ${user.id}
    `;
  }
  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({
  email: z.string().email()
});

export async function DELETE(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const user = await getUserByEmail(parsed.data.email);
  if (!user) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  await deleteUserByEmail(parsed.data.email);
  return NextResponse.json({ ok: true });
}
