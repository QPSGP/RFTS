import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  ensureSubscription,
  getMemberProfileByUserId,
  getUserById
} from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getSubscriptionActiveEmailContent } from "@/lib/email-templates";

function tierDisplayName(tier: string | undefined): string | null {
  if (tier === "platinum_managed") return "Platinum Managed";
  if (tier === "platinum") return "Gold Member";
  return tier ? tier : null;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const tier = session.metadata?.tier as string | undefined;
    if (userId && (tier === "platinum" || tier === "platinum_managed")) {
      await ensureSubscription(
        userId,
        tier === "platinum_managed" ? "platinum_managed" : "platinum",
        "active"
      );
      try {
        const user = await getUserById(userId);
        if (user?.email) {
          const profile = await getMemberProfileByUserId(userId);
          const firstName = profile?.firstName ?? null;
          const tpl = getSubscriptionActiveEmailContent(
            firstName,
            tierDisplayName(tier)
          );
          const { ok, error } = await sendEmail({
            to: user.email,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text
          });
          if (!ok) {
            console.error("[stripe webhook] Subscription active email failed:", error);
          }
        }
      } catch (e) {
        console.error("[stripe webhook] Subscription active email:", e);
      }
    }
  }

  return NextResponse.json({ received: true });
}
