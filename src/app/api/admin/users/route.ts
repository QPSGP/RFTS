import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { isAdminSession } from "@/lib/auth";
import {
  createUser,
  ensureSubscription,
  getUserByEmail,
  getUserProfile,
  listUsers
} from "@/lib/db";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tier: z.enum(["bronze", "gold", "platinum"]).default("bronze"),
  status: z.enum(["inactive", "active", "past_due", "canceled"]).default("inactive")
});

const updateSchema = z.object({
  email: z.string().email(),
  tier: z.enum(["bronze", "gold", "platinum"]).optional(),
  status: z.enum(["inactive", "active", "past_due", "canceled"]).optional()
});

export async function GET() {
  if (!isAdminSession()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const users = await listUsers();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  if (!isAdminSession()) {
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
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  if (!isAdminSession()) {
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
  const tier = parsed.data.tier ?? profile?.subscriptionTier ?? "bronze";
  const status = parsed.data.status ?? profile?.subscriptionStatus ?? "inactive";
  await ensureSubscription(user.id, tier, status);
  return NextResponse.json({ ok: true });
}
