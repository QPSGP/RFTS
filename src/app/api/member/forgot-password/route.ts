import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { apiError } from "@/lib/api-utils";
import {
  getUserByEmail,
  createPasswordResetToken
} from "@/lib/db";
import { sendEmail, getBaseUrl } from "@/lib/email";
import { getForgotPasswordEmailContent } from "@/lib/email-templates";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email()
});

const TOKEN_EXPIRY_HOURS = 1;
const FORGOT_PASSWORD_MAX_PER_MINUTE = 5;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`forgot-password:${ip}`, FORGOT_PASSWORD_MAX_PER_MINUTE)) {
    return apiError("Too many requests. Please try again in a minute.", 429);
  }
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();
  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ message: "If that email is on file, we sent a reset link." });
  }
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  await createPasswordResetToken(user.id, token, expiresAt);
  const origin = request.headers.get("origin") || request.headers.get("referer")?.replace(/\/[^/]*$/, "");
  const baseUrl = getBaseUrl(origin);
  const resetUrl = `${baseUrl}/member/reset-password?token=${token}`;
  const tpl = getForgotPasswordEmailContent(resetUrl, TOKEN_EXPIRY_HOURS);
  const { ok, error } = await sendEmail({
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text
  });
  if (!ok) {
    return NextResponse.json({ error: error || "Could not send email." }, { status: 500 });
  }
  return NextResponse.json({ message: "If that email is on file, we sent a reset link." });
}
