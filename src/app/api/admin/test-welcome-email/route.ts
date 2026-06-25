import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { getWelcomeEmailCcRecipients, sendEmail } from "@/lib/email";
import { getWelcomeEmailContent } from "@/lib/email-templates";

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

export async function POST(request: Request) {
  const admin = await isAdminSession();
  if (!admin && !authorizedCron(request)) {
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
    "Richard@richardleeweatherman.com";
  const welcome = getWelcomeEmailContent(parsed.data.firstName, parsed.data.lastName);
  const welcomeCc = getWelcomeEmailCcRecipients();

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
    subject: welcome.subject
  });
}
