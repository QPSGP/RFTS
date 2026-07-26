import { NextResponse } from "next/server";
import { getUserProfile, getUserStripeConnectFields } from "@/lib/db";
import {
  createConnectOnboardingLink,
  createExpressConnectAccount,
  formatStripeConnectError,
  getMemberStripeConnectStatus
} from "@/lib/stripe-connect";
import { getStripe } from "@/lib/stripe";
import { getUserSessionEmail } from "@/lib/user-auth";

export async function GET() {
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const user = await getUserProfile(email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  try {
    const status = await getMemberStripeConnectStatus(user.id);
    return NextResponse.json({ status });
  } catch (err) {
    console.error("[affiliate/connect GET]", err);
    return NextResponse.json({ error: formatStripeConnectError(err) }, { status: 502 });
  }
}

export async function POST() {
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const user = await getUserProfile(email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const stripe = getStripe();
    const fields = await getUserStripeConnectFields(user.id);
    let accountId = fields?.stripeConnectAccountId;
    if (!accountId) {
      accountId = await createExpressConnectAccount(stripe, user.id, user.email);
    }
    const url = await createConnectOnboardingLink(stripe, accountId);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[affiliate/connect POST]", err);
    return NextResponse.json({ error: formatStripeConnectError(err) }, { status: 502 });
  }
}
