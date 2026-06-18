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
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input. Password must be at least 6 characters." },
        { status: 400 }
      );
    }
    const { token, newPassword } = parsed.data;
    const row = await getPasswordResetTokenByToken(token);
    if (!row) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Request a new one." },
        { status: 400 }
      );
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await updateUserPassword(row.user_id, passwordHash);
    if (!updated) {
      console.error("[reset-password] No user row updated for user_id", row.user_id);
      return NextResponse.json(
        { error: "Could not update password. Please contact support or try again." },
        { status: 500 }
      );
    }
    await deletePasswordResetToken(token);
    return NextResponse.json({ ok: true, message: "Password updated. You can sign in now." });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/member/reset-password]", message);
    return NextResponse.json(
      { error: "Server error while updating password. Please try again." },
      { status: 500 }
    );
  }
}
