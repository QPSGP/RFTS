import { NextResponse } from "next/server";
import { getUserSessionEmail } from "@/lib/user-auth";
import { getLatestLgdIntakeForUser, getUserProfile } from "@/lib/db";
import { canAccessLgdSurfaces, isLgdAdminOnlyMode } from "@/lib/lgd-access";
import { createLgdCheckoutSession } from "@/lib/lgd-stripe";
import { getPublicSiteUrl } from "@/lib/site-url";
import { isAdminSession } from "@/lib/auth";

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
  const intake = await getLatestLgdIntakeForUser(user.id);
  if (!intake || intake.status === "draft") {
    return NextResponse.json(
      { error: "Submit your Life Guidance Discovery intake before checkout." },
      { status: 400 }
    );
  }
  if (intake.paidAt) {
    return NextResponse.json({ error: "This intake is already marked paid." }, { status: 409 });
  }
  try {
    const session = await createLgdCheckoutSession({
      userId: user.id,
      memberEmail: email,
      intakeId: intake.id,
      baseUrl: getPublicSiteUrl()
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed.";
    console.error("[POST /api/member/lgd-checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
