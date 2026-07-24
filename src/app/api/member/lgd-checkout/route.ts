import { NextResponse } from "next/server";
import { getUserSessionEmail } from "@/lib/user-auth";
import {
  createLgdIntakeDraft,
  getLatestLgdIntakeForUser,
  getUserProfile
} from "@/lib/db";
import { canAccessLgdSurfaces, isLgdAdminOnlyMode } from "@/lib/lgd-access";
import { createLgdCheckoutSession } from "@/lib/lgd-stripe";
import { getPublicSiteUrl } from "@/lib/site-url";
import { isAdminSession } from "@/lib/auth";
import { emptyLgdIntakeAnswers } from "@/lib/lgd-intake";

/**
 * Pay-first LGD packaging: creates an unpaid draft if needed, then Stripe Checkout.
 * After payment the member fills and submits that draft.
 */
export async function POST() {
  if (isLgdAdminOnlyMode() && !(await isAdminSession())) {
    return NextResponse.json(
      { error: "Life Guidance Discovery checkout is in admin preview only." },
      { status: 403 }
    );
  }
  if (!(await canAccessLgdSurfaces()) && !(await getUserSessionEmail())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const user = await getUserProfile(email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  let intake = await getLatestLgdIntakeForUser(user.id);
  // Reuse unpaid draft; otherwise start a new draft for this purchase.
  if (!intake || intake.status !== "draft" || intake.paidAt) {
    intake = await createLgdIntakeDraft(user.id, emptyLgdIntakeAnswers());
  }
  try {
    const session = await createLgdCheckoutSession({
      userId: user.id,
      memberEmail: email,
      intakeId: intake.id,
      baseUrl: getPublicSiteUrl()
    });
    return NextResponse.json({ url: session.url, intakeId: intake.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed.";
    console.error("[POST /api/member/lgd-checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
