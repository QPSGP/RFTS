import { NextResponse } from "next/server";

/** Legacy account create. Signup goes through /api/member/onboarding. */
export async function POST() {
  return NextResponse.json(
    { error: "Create your account from the signup page." },
    { status: 410 }
  );
}
