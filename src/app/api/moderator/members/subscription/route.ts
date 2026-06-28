import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ensureSubscription,
  getSubscriptionStripeIdsForUser,
  getUserByEmail,
  getUserProfile
} from "@/lib/db";
import { recordModeratorStaffActivity } from "@/lib/facilitator-staff-activity";
import { requireModeratorAssignedMember } from "@/lib/moderator-member-access";

const querySchema = z.object({
  email: z.string().email()
});

const patchSchema = z.object({
  email: z.string().email(),
  tier: z.enum(["platinum", "platinum_managed"]).optional(),
  status: z.enum(["inactive", "active"]).optional()
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ email: url.searchParams.get("email") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const access = await requireModeratorAssignedMember(parsed.data.email);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const user = await getUserByEmail(access.memberEmail);
  if (!user) {
    return NextResponse.json({
      email: access.memberEmail,
      registered: false,
      subscriptionTier: null,
      subscriptionStatus: null,
      hasStripeOnFile: false
    });
  }

  const profile = await getUserProfile(access.memberEmail);
  const stripeRow = await getSubscriptionStripeIdsForUser(user.id);
  const hasStripeOnFile =
    !!(stripeRow?.stripeCustomerId?.trim() || stripeRow?.stripeSubscriptionId?.trim());

  return NextResponse.json({
    email: user.email,
    registered: true,
    subscriptionTier: profile?.subscriptionTier ?? null,
    subscriptionStatus: profile?.subscriptionStatus ?? null,
    hasStripeOnFile,
    stripeCustomerId: stripeRow?.stripeCustomerId ?? null,
    stripeSubscriptionId: stripeRow?.stripeSubscriptionId ?? null
  });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  if (!parsed.data.tier && !parsed.data.status) {
    return NextResponse.json({ error: "Provide tier or status to update." }, { status: 400 });
  }

  const access = await requireModeratorAssignedMember(parsed.data.email);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const user = await getUserByEmail(access.memberEmail);
  if (!user) {
    return NextResponse.json({ error: "Member has not registered yet." }, { status: 404 });
  }

  const profile = await getUserProfile(access.memberEmail);
  const tier = parsed.data.tier ?? profile?.subscriptionTier ?? "platinum";
  const rawStatus = parsed.data.status ?? profile?.subscriptionStatus ?? "inactive";
  const status: "inactive" | "active" = rawStatus === "active" ? "active" : "inactive";

  await ensureSubscription(user.id, tier, status);

  const activityParts = [];
  if (parsed.data.tier) activityParts.push(`tier:${parsed.data.tier}`);
  if (parsed.data.status) activityParts.push(`status:${parsed.data.status}`);
  await recordModeratorStaffActivity(
    `updated_member_subscription:${access.memberEmail}:${activityParts.join(",")}`
  );

  return NextResponse.json({
    ok: true,
    subscriptionTier: tier,
    subscriptionStatus: status
  });
}
