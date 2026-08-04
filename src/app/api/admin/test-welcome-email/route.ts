import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { getWelcomeEmailCcRecipients, sendEmail } from "@/lib/email";
import {
  getWelcomeEmailContent,
  welcomeEmailHasUpdatedPlatinumCopy,
  WELCOME_EMAIL_PLATINUM_MANAGED_COPY
} from "@/lib/email-templates";

const bodySchema = z.object({
  to: z.string().email().optional(),
  firstName: z.string().optional().default("Smoke"),
  lastName: z.string().optional().default("Test")
});

function authorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

async function authorize(request: Request): Promise<boolean> {
  if (authorizedCron(request)) return true;
  return isAdminSession();
}

function welcomeEmailVerification(firstName?: string, lastName?: string) {
  const welcome = getWelcomeEmailContent(firstName, lastName);
  return {
    welcome,
    platinumCopyOk: welcomeEmailHasUpdatedPlatinumCopy(welcome),
    platinumManagedCopy: WELCOME_EMAIL_PLATINUM_MANAGED_COPY
  };
}

/** Preview deployed welcome email copy without sending mail. */
export async function GET(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { platinumCopyOk, platinumManagedCopy } = welcomeEmailVerification("Smoke", "Test");
  return NextResponse.json({
    ok: true,
    platinumCopyOk,
    platinumManagedCopy
  });
}

export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let json: unknown = {};
  try {
    json = await request.json();
  } catch {
    json = {};
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const to =
    parsed.data.to?.trim() ||
    process.env.SIGNUP_EMAIL_TEST_TO?.trim() ||
    "richard@visimon.app";
  const { welcome, platinumCopyOk, platinumManagedCopy } = welcomeEmailVerification(
    parsed.data.firstName,
    parsed.data.lastName
  );

  if (!platinumCopyOk) {
    return NextResponse.json(
      {
        error: "Welcome email template still uses outdated Platinum Managed copy.",
        platinumCopyOk,
        platinumManagedCopy
      },
      { status: 500 }
    );
  }

  const welcomeCc = await getWelcomeEmailCcRecipients();

  const result = await sendEmail({
    to,
    cc: welcomeCc,
    subject: welcome.subject,
    html: welcome.html,
    text: welcome.text,
    skipStaffBcc: true
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Send failed." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    to,
    cc: welcomeCc,
    subject: welcome.subject,
    platinumCopyOk,
    platinumManagedCopy
  });
}
