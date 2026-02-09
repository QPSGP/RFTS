import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createUserSessionToken, setUserSession } from "@/lib/user-auth";
import { getStripe, getStripeMode } from "@/lib/stripe";
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
  skipPayment: z.boolean().optional().default(false),
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
  if (!plan) {
    return NextResponse.json({ error: "Subscription plan is unavailable." }, { status: 400 });
  }
  let stripeIsDemo = false;
  try {
    stripeIsDemo = getStripeMode() === "demo";
  } catch {
    stripeIsDemo = false;
  }
  const isDemoSkip =
    parsed.data.skipPayment &&
    (stripeIsDemo || process.env.DEMO_SKIP_STRIPE === "true");
  if (!isDemoSkip && !plan.priceId) {
    return NextResponse.json(
      { error: "Stripe Price ID not configured. Add it in Admin → Subscriptions, or use Skip Payment in demo mode." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await createUser(parsed.data.email, passwordHash);
  const subscriptionStatus = isDemoSkip ? "active" : "inactive";
  await ensureSubscription(user.id, plan.id as "bronze" | "gold" | "platinum", subscriptionStatus);
  await setUserGoals(user.id, parsed.data.goalIds);
  await setUserPlaysPerNight(user.id, parsed.data.playsPerNight);
  const yearBorn = parsed.data.profile.yearBorn ?? null;
  const currentYear = new Date().getFullYear();
  const isAgeVerified = yearBorn != null && currentYear - yearBorn >= 18;
  const adultConsent = parsed.data.profile.adultConsent && isAgeVerified;

  await upsertMemberProfile({
    userId: user.id,
    firstName: parsed.data.profile.firstName,
    lastName: parsed.data.profile.lastName,
    gender: parsed.data.profile.gender,
    yearBorn,
    contactNumber: parsed.data.profile.contactNumber,
    bestContactTimes: parsed.data.profile.bestContactTimes,
    timeZone: parsed.data.profile.timeZone,
    occupation: parsed.data.profile.occupation,
    incomeGoal: parsed.data.profile.incomeGoal,
    incomeGoalYear: parsed.data.profile.incomeGoalYear,
    incomeGoalRelation: parsed.data.profile.incomeGoalRelation,
    isFirstResponder: parsed.data.profile.isFirstResponder,
    wantsPracticeGrowth: parsed.data.profile.wantsPracticeGrowth,
    adultConsent,
    wantsPolyamory: parsed.data.profile.wantsPolyamory,
    hadLgdSession: parsed.data.profile.hadLgdSession,
    referralSource: parsed.data.profile.referralSource
  });

  const token = createUserSessionToken(parsed.data.email);
  setUserSession(token);

  if (isDemoSkip) {
    return NextResponse.json({ url: "/play-options" });
  }

  try {
    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: user.id,
      metadata: { tier: plan.id },
      line_items: [{ price: plan.priceId, quantity: 1 }],
      subscription_data:
        plan.trialDays && plan.trialDays > 0
          ? { trial_period_days: plan.trialDays }
          : undefined,
      success_url: `${baseUrl}/play-options`,
      cancel_url: `${baseUrl}/signup/step-1-subscription-selection`,
      allow_promotion_codes: true
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Member already saved; redirect to portal so they can complete payment later
    return NextResponse.json({ url: "/play-options" });
  }
}
