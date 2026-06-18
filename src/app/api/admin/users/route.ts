import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sql } from "@vercel/postgres";
import { isAdminSession } from "@/lib/auth";
import {
  canonicalizeUserEmail,
  createUser,
  deleteUserByEmail,
  ensureSubscription,
  getUserByEmail,
  getUserProfile,
  getSubscriptionStripeIdsForUser,
  listUsers,
  setUserGoals,
  setUserPlaysPerNight,
  updateSubscriptionStripeIdsForUser,
  upsertMemberProfile
} from "@/lib/db";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  tier: z.enum(["platinum", "platinum_managed"]).default("platinum"),
  status: z.enum(["inactive", "active", "past_due", "canceled"]).default("inactive"),
  playsPerNight: z.number().int().min(1).max(2).optional()
});

const updateSchema = z.object({
  email: z.string().email(),
  tier: z.enum(["platinum", "platinum_managed"]).optional(),
  status: z.enum(["inactive", "active", "past_due", "canceled"]).optional(),
  goalIds: z.array(z.string()).max(10).optional(),
  playsPerNight: z.number().int().min(1).max(2).optional(),
  resetPassword: z.string().min(6).optional(),
  stripeCustomerId: z.string().trim().optional(),
  stripeSubscriptionId: z.string().trim().optional()
});

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/users]", message);
    return NextResponse.json({ error: "Failed to list members.", detail: message }, { status: 500 });
  }
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
    await upsertMemberProfile({
      userId: user.id,
      firstName: parsed.data.firstName?.trim() || null,
      lastName: parsed.data.lastName?.trim() || null
    });
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
  if (
    parsed.data.stripeCustomerId !== undefined ||
    parsed.data.stripeSubscriptionId !== undefined
  ) {
    const existing = await getSubscriptionStripeIdsForUser(user.id);
    const customerId =
      parsed.data.stripeCustomerId !== undefined
        ? parsed.data.stripeCustomerId || null
        : existing?.stripeCustomerId ?? null;
    const subscriptionId =
      parsed.data.stripeSubscriptionId !== undefined
        ? parsed.data.stripeSubscriptionId || null
        : existing?.stripeSubscriptionId ?? null;
    if (customerId && !customerId.startsWith("cus_")) {
      return NextResponse.json({ error: "Stripe Customer ID must start with cus_" }, { status: 400 });
    }
    if (subscriptionId && !subscriptionId.startsWith("sub_")) {
      return NextResponse.json({ error: "Stripe Subscription ID must start with sub_" }, { status: 400 });
    }
    await updateSubscriptionStripeIdsForUser(user.id, customerId, subscriptionId);
  }
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
  await canonicalizeUserEmail(user.id);
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
