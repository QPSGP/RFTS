import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import {
  getUserByEmail,
  createPasswordResetToken
} from "@/lib/db";
import { sendEmail, getBaseUrl } from "@/lib/email";

const schema = z.object({
  email: z.string().email()
});

const TOKEN_EXPIRY_HOURS = 1;

export async function POST(request: Request) {
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
  const { ok, error } = await sendEmail({
    to: user.email,
    subject: "Reset your Reach For The Stars password",
    html: `
      <p>You asked to reset your password.</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>This link expires in ${TOKEN_EXPIRY_HOURS} hour(s). If you didn’t request this, you can ignore this email.</p>
    `,
    text: `Reset your password: ${resetUrl}\n\nThis link expires in ${TOKEN_EXPIRY_HOURS} hour(s).`
  });
  if (!ok) {
    return NextResponse.json({ error: error || "Could not send email." }, { status: 500 });
  }
  return NextResponse.json({ message: "If that email is on file, we sent a reset link." });
}
