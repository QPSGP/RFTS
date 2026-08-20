import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { apiError } from "@/lib/api-utils";
import { createUserSessionToken, setUserSessionCookieOnResponse } from "@/lib/user-auth";
import { getStripe, getStripeMode } from "@/lib/stripe";
import { createMembershipCheckoutSession } from "@/lib/stripe-checkout";
import {
  addEmailToLibraryItemAllowedList,
  createUser,
  ensureSubscription,
  getPlaybackSettings,
  getSubscriptionStripeIdsForUser,
  getUserByEmail,
  listLibrary,
  listSubscriptionPlans,
  setUserGoals,
  setUserPlaysPerNight,
  setUserReferredByAffiliateCode,
  upsertMemberProfile
} from "@/lib/db";
import { createBillingPortalSessionUrl } from "@/lib/stripe-billing-portal";
import { getBillingPortalReturnPath } from "@/lib/member-billing";
import { getWelcomeEmailCcRecipients, sendEmail } from "@/lib/email";
import { stripSkuHyphens } from "@/lib/sku-code";
import { getPublicSiteUrl } from "@/lib/site-url";
import {
  getWelcomeEmailContent,
  getLgdInterestEmailContent,
  getTherapistHealerCoachEmailContent
} from "@/lib/email-templates";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const SIGNUP_MAX_PER_MINUTE = 5;

const schema = z.object({
  planId: z.string(),
  skipPayment: z.boolean().optional().default(false),
  email: z.string().email(),
  password: z.string().trim().min(6),
  goalIds: z.array(z.string()).min(1).max(10),
  playsPerNight: z.number().int().min(1).max(2).default(2),
  affiliateRef: z.string().optional(),
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
    wantsLgdInfo: z.boolean().optional().default(false),
    hadLgdSession: z.boolean().optional().default(false),
    referralSource: z.string().optional().default("")
  })
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`signup:${ip}`, SIGNUP_MAX_PER_MINUTE)) {
    return apiError("Too many signup attempts. Please try again in a minute.", 429);
  }
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
  const demoSkipEnv = process.env.DEMO_SKIP_STRIPE === "true";
  const noStripeKey = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "sk_test_replace";
  const isDemoSkip =
    demoSkipEnv ||
    noStripeKey ||
    (parsed.data.skipPayment && (stripeIsDemo || demoSkipEnv)) ||
    !plan.priceId;
  if (!isDemoSkip && !plan.priceId) {
    return NextResponse.json(
      { error: "Stripe Price ID not configured. Add it in Admin → Subscriptions, or use Skip Payment in demo mode." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await createUser(parsed.data.email, passwordHash);
  try {
    const { suppressCampaignsForEmail } = await import("@/lib/outreach-campaigns");
    await suppressCampaignsForEmail(user.email, "converted");
  } catch (e) {
    console.error("[onboarding] Campaign suppress failed:", e);
  }
  if (parsed.data.affiliateRef?.trim()) {
    try {
      await setUserReferredByAffiliateCode(
        user.id,
        parsed.data.affiliateRef,
        user.email
      );
    } catch (e) {
      console.error("[onboarding] affiliate ref:", e);
    }
  }
  const subscriptionStatus = isDemoSkip ? "active" : "inactive";
  await ensureSubscription(user.id, "platinum", subscriptionStatus);
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
    wantsLgdInfo: parsed.data.profile.wantsLgdInfo,
    hadLgdSession: parsed.data.profile.hadLgdSession,
    referralSource: parsed.data.profile.referralSource
  });

  // Assign fallback track (e.g. T-18) to new member so they get it in their schedule until a CGMR is assigned.
  try {
    const settings = await getPlaybackSettings();
    const fallbackCode = stripSkuHyphens(settings.fallbackTrackId || "T18");
    if (fallbackCode) {
      const library = await listLibrary();
      const fallbackItem = library.find(
        (item) =>
          stripSkuHyphens(item.skuCode || "") === fallbackCode ||
          stripSkuHyphens(item.skuCode || "").includes(fallbackCode) ||
          (item.title || "").toUpperCase().includes(fallbackCode)
      );
      if (fallbackItem) {
        await addEmailToLibraryItemAllowedList(fallbackItem.id, user.email);
      }
    }
  } catch (e) {
    console.error("[onboarding] Assign fallback track to new member:", e);
  }

  const firstName = parsed.data.profile.firstName || null;
  const lastName = parsed.data.profile.lastName || null;
  const emailTo = user.email;
  const welcome = getWelcomeEmailContent(firstName, lastName);
  const welcomeCc = await getWelcomeEmailCcRecipients({
    memberEmail: emailTo,
    firstName,
    lastName,
    referralSource: parsed.data.profile.referralSource
  });
  const welcomeResult = await sendEmail({
    to: emailTo,
    cc: welcomeCc,
    subject: welcome.subject,
    html: welcome.html,
    text: welcome.text,
    skipStaffBcc: true
  });
  if (!welcomeResult.ok) console.error("[onboarding] Welcome email failed:", welcomeResult.error);
  if (parsed.data.profile.wantsLgdInfo) {
    const lgd = getLgdInterestEmailContent(firstName);
    const lgdResult = await sendEmail({
      to: emailTo,
      cc: welcomeCc,
      subject: lgd.subject,
      html: lgd.html,
      text: lgd.text,
      skipStaffBcc: true
    });
    if (!lgdResult.ok) console.error("[onboarding] LGD interest email failed:", lgdResult.error);
  }
  if (parsed.data.profile.wantsPracticeGrowth) {
    const thc = getTherapistHealerCoachEmailContent(firstName);
    const thcResult = await sendEmail({
      to: emailTo,
      cc: welcomeCc,
      subject: thc.subject,
      html: thc.html,
      text: thc.text,
      skipStaffBcc: true
    });
    if (!thcResult.ok) console.error("[onboarding] Therapist/healer/coach email failed:", thcResult.error);
  }

  const token = createUserSessionToken(user.email);
  const baseUrl = getPublicSiteUrl();

  if (isDemoSkip) {
    const res = NextResponse.json({ url: "/play-options" });
    setUserSessionCookieOnResponse(res, token, request);
    return res;
  }

  try {
    const stripe = getStripe();
    const stripeRow = await getSubscriptionStripeIdsForUser(user.id);
    const hasExistingStripe =
      !!(stripeRow?.stripeSubscriptionId?.trim() || stripeRow?.stripeCustomerId?.trim());
    if (hasExistingStripe) {
      try {
        const portalUrl = await createBillingPortalSessionUrl(stripe, {
          stripeCustomerId: stripeRow?.stripeCustomerId,
          stripeSubscriptionId: stripeRow?.stripeSubscriptionId,
          baseUrl,
          returnPath: getBillingPortalReturnPath(user.email)
        });
        if (portalUrl) {
          const res = NextResponse.json({ url: portalUrl, billingPortal: true });
          setUserSessionCookieOnResponse(res, token, request);
          return res;
        }
      } catch (portalErr) {
        console.error("[onboarding] Billing portal:", portalErr);
        return NextResponse.json(
          {
            error:
              "We could not open your billing page. If you already pay through Stripe, use the billing link from your email or contact support."
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        {
          error:
            "This account already has Stripe billing on file. Please use Manage billing in your profile or contact support so we do not create a duplicate subscription."
        },
        { status: 409 }
      );
    }

    const session = await createMembershipCheckoutSession(stripe, {
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
    console.error("[onboarding] Stripe Checkout failed:", err);
    // Member already saved; redirect so they can complete payment later
    const res = NextResponse.json({ url: "/play-options" });
    setUserSessionCookieOnResponse(res, token, request);
    return res;
  }
}
