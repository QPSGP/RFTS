import { NextResponse } from "next/server";
import {
  createUserSessionToken,
  setUserSessionCookieOnResponse,
  verifyBillingReturnToken
} from "@/lib/user-auth";

/** Stripe billing portal return: restore member session and land on the console. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t")?.trim();
  const consoleUrl = new URL("/play-options", url.origin);

  if (!token) {
    return NextResponse.redirect(consoleUrl);
  }

  const email = verifyBillingReturnToken(token);
  if (!email) {
    const loginUrl = new URL("/member/login", url.origin);
    loginUrl.searchParams.set("next", "/play-options");
    return NextResponse.redirect(loginUrl);
  }

  const sessionToken = createUserSessionToken(email);
  const response = NextResponse.redirect(consoleUrl);
  setUserSessionCookieOnResponse(response, sessionToken, request);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
