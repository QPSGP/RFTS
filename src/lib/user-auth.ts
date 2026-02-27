import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getMemberProfileByUserId, getUserProfile } from "@/lib/db";

const sessionCookie = "rfts_user_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

const getSecret = () => process.env.SESSION_SECRET || "dev-secret";

const sign = (value: string) => {
  return crypto
    .createHmac("sha256", getSecret())
    .update(value)
    .digest("hex");
};

export const createUserSessionToken = (email: string) => {
  const issuedAt = Date.now().toString();
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = `${email}|${issuedAt}|${nonce}`;
  const signature = sign(payload);
  return `${payload}|${signature}`;
};

const sessionCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS
});

/** Set session cookie on a response (use in route handlers so Set-Cookie is on the returned response). */
export function setUserSessionCookieOnResponse(response: NextResponse, token: string): void {
  response.cookies.set(sessionCookie, token, sessionCookieOptions());
}

/** Build Set-Cookie header value (value in quotes so characters like | don't break parsing). */
export function buildMemberSessionSetCookieHeader(token: string): string {
  const opts = sessionCookieOptions();
  const value = `"${token.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const parts = [
    `${sessionCookie}=${value}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    `HttpOnly`,
    `SameSite=${opts.sameSite}`
  ];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

export async function setUserSession(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, token, sessionCookieOptions());
}

export async function clearUserSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, "", { ...sessionCookieOptions(), maxAge: 0 });
}

export async function getUserSessionEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  let token = cookieStore.get(sessionCookie)?.value;
  if (!token) {
    return null;
  }
  try {
    token = decodeURIComponent(token);
  } catch {
    // leave as-is if not encoded
  }
  if (token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  // Some runtimes send + as space in cookie values; restore for email addresses like user+tag@example.com
  token = token.replace(/ /g, "+");
  const parts = token.split("|");
  if (parts.length !== 4) {
    return null;
  }
  const [email, issuedAt, nonce, signature] = parts;
  const payload = `${email}|${issuedAt}|${nonce}`;
  if (sign(payload) !== signature) {
    return null;
  }
  return email;
};

/** Server-side: get full member profile for current session (same shape as GET /api/user/me). */
export async function getMemberProfileForSession(): Promise<{
  id: string;
  email: string;
  goalIds: string[];
  goalUpdatedAt: string | null;
  playsPerNight: number;
  subscriptionStatus: string | null;
  subscriptionTier: string | null;
  adultConsent: boolean;
  yearBorn: number | null;
  hasVerifiedAge: boolean;
  wantsPracticeGrowth: boolean;
} | null> {
  const email = await getUserSessionEmail();
  if (!email) return null;
  const profile = await getUserProfile(email);
  if (!profile) return null;
  const memberProfile = await getMemberProfileByUserId(profile.id);
  const yearBorn = memberProfile?.yearBorn ?? null;
  const currentYear = new Date().getFullYear();
  const hasVerifiedAge = yearBorn != null && currentYear - yearBorn >= 18;
  const storedConsent = memberProfile?.adultConsent ?? false;
  const adultConsent = storedConsent && hasVerifiedAge;
  const wantsPracticeGrowth = memberProfile?.wantsPracticeGrowth ?? false;
  return {
    ...profile,
    adultConsent,
    yearBorn,
    hasVerifiedAge,
    wantsPracticeGrowth
  };
}
