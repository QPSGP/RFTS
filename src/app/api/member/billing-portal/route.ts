import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile } from "@/lib/db";
import { createMemberBillingPortalUrl } from "@/lib/member-billing";
import { getUserSessionEmail } from "@/lib/user-auth";

const bodySchema = z.object({
  returnPath: z.string().optional()
});

export async function POST(request: Request) {
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await getUserProfile(email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let returnPath: string | undefined;
  try {
    const raw = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    returnPath = parsed.data.returnPath;
  } catch {
    returnPath = undefined;
  }

  const result = await createMemberBillingPortalUrl({
    userId: user.id,
    userEmail: user.email,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    returnPath
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if ("billingPortal" in result) {
    return NextResponse.json({ url: result.url, billingPortal: true });
  }

  return NextResponse.json({ url: result.url, checkout: true });
}
