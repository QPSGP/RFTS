import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  getPasswordResetTokenByToken,
  deletePasswordResetToken,
  updateUserPassword
} from "@/lib/db";

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6)
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input. Password must be at least 6 characters." }, { status: 400 });
  }
  const { token, newPassword } = parsed.data;
  const row = await getPasswordResetTokenByToken(token);
  if (!row) {
    return NextResponse.json({ error: "Invalid or expired reset link. Request a new one." }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(row.user_id, passwordHash);
  await deletePasswordResetToken(token);
  return NextResponse.json({ message: "Password updated. You can sign in now." });
}
