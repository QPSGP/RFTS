import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createUserSessionToken, setUserSession } from "@/lib/user-auth";
import { getStripe } from "@/lib/stripe";
import {
  createUser,
  ensureSubscription,
  getUserByEmail,
  listSubscriptionPlans,
  setUserGoals,
  setUserPlaysPerNight,
  upsertMemberProfile
} from "@/lib/db";

const schema = z.object({
  planId: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  goalIds: z.array(z.string()).min(1).max(10),
  playsPerNight: z.number().int().min(1).max(2).default(2),
  profile: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    gender: z.string().optional().default(""),
    yearBorn: z.number().int().min(1900).max(2100).optional(),
    contactNumber: z.string().optional().default(""),
    bestContactTimes: z.string().optional().default(""),
    timeZone: z.string().min(2),
    occupation: z.string().optional().default(""),
    incomeGoal: z.string().optional().default(""),
    incomeGoalYear: z.number().int().min(1900).max(2100).optional(),
    incomeGoalRelation: z.string().optional().default(""),
    isFirstResponder: z.boolean().optional().default(false),
    wantsPracticeGrowth: z.boolean().optional().default(false),
    adultConsent: z.boolean().optional().default(false),
    wantsPolyamory: z.boolean().optional().default(false),
    hadLgdSession: z.boolean().optional().default(false),
    referralSource: z.string().optional().default("")
  })
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const existing = await getUserByEmail(parsed.data.email);
  if (existing) {
    return NextResponse.json({ error: "Member already exists." }, { status: 409 });
  }

  const plans = await listSubscriptionPlans();
  const plan = plans.find((item) => item.id === parsed.data.planId);
  if (!plan || !plan.priceId) {
    return NextResponse.json({ error: "Subscription plan is unavailable." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await createUser(parsed.data.email, passwordHash);
  await ensureSubscription(user.id, plan.id as "bronze" | "gold" | "platinum", "inactive");
  await setUserGoals(user.id, parsed.data.goalIds);
  await setUserPlaysPerNight(user.id, parsed.data.playsPerNight);
  await upsertMemberProfile({
    userId: user.id,
    firstName: parsed.data.profile.firstName,
    lastName: parsed.data.profile.lastName,
    gender: parsed.data.profile.gender,
    yearBorn: parsed.data.profile.yearBorn,
    contactNumber: parsed.data.profile.contactNumber,
    bestContactTimes: parsed.data.profile.bestContactTimes,
    timeZone: parsed.data.profile.timeZone,
    occupation: parsed.data.profile.occupation,
    incomeGoal: parsed.data.profile.incomeGoal,
    incomeGoalYear: parsed.data.profile.incomeGoalYear,
    incomeGoalRelation: parsed.data.profile.incomeGoalRelation,
    isFirstResponder: parsed.data.profile.isFirstResponder,
    wantsPracticeGrowth: parsed.data.profile.wantsPracticeGrowth,
    adultConsent: parsed.data.profile.adultConsent,
    wantsPolyamory: parsed.data.profile.wantsPolyamory,
    hadLgdSession: parsed.data.profile.hadLgdSession,
    referralSource: parsed.data.profile.referralSource
  });

  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: plan.priceId, quantity: 1 }],
    subscription_data:
      plan.trialDays && plan.trialDays > 0
        ? { trial_period_days: plan.trialDays }
        : undefined,
    success_url: `${baseUrl}/play-options`,
    cancel_url: `${baseUrl}/signup/step-1-subscription-selection`,
    allow_promotion_codes: true
  });

  const token = createUserSessionToken(parsed.data.email);
  setUserSession(token);
  return NextResponse.json({ url: session.url });
}
