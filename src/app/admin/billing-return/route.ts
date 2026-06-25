import { NextResponse } from "next/server";
import {
  createSessionToken,
  setSessionCookieOnResponse,
  verifyAdminBillingReturnToken
} from "@/lib/auth";

function normalizeAdminNextPath(nextRaw: string | null): string {
  const fallback = "/admin/content";
  const raw = (nextRaw || fallback).trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  const pathname = raw.split("?")[0]?.split("#")[0] ?? fallback;
  if (!pathname.startsWith("/admin")) return fallback;
  return raw;
}

/** Stripe Checkout cancel return: restore admin session and land back in the admin console. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t")?.trim();
  const nextPath = normalizeAdminNextPath(url.searchParams.get("next"));
  const destination = new URL(nextPath, url.origin);

  if (!token) {
    return NextResponse.redirect(destination);
  }

  const email = verifyAdminBillingReturnToken(token);
  if (!email) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  const sessionToken = createSessionToken(email);
  const response = NextResponse.redirect(destination);
  setSessionCookieOnResponse(response, sessionToken, request);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
