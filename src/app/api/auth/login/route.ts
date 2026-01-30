import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, setSession, verifyAdminCredentials } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { email, password } = parsed.data;
  const isValid = await verifyAdminCredentials(email, password);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  const token = createSessionToken(email);
  setSession(token);
  return NextResponse.json({ ok: true });
}
