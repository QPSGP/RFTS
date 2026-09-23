import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  authSessionActive,
  consumeAuthToken,
  deleteAuthSession,
  insertAuthSession,
  legacyCredentialAllows,
  newSessionId
} from "@/lib/auth-sessions";
import { getMemberProfileByUserId, getUserProfile, normalizeMemberEmail } from "@/lib/db";
import {
  buildSessionToken,
  getSessionSecret,
  parseSessionToken,
  signPayload,
  signaturesMatch
} from "@/lib/session-token";
import { getProductionCookieDomain } from "@/lib/site-url";

const sessionCookie = "rfts_user_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

const sign = (value: string) => {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("SESSION_SECRET is not set.");
  }
  return signPayload(value, secret);
};

export async function createUserSessionToken(email: string): Promise<string> {
  const normalized = normalizeMemberEmail(email);
  const sessionId = newSessionId();
  try {
    await insertAuthSession({ id: sessionId, email: normalized, kind: "member" });
    return buildSessionToken(normalized, sessionId);
  } catch (error) {
    console.error("[session] member session id not stored; issuing legacy cookie", error);
    return buildSessionToken(normalized, null);
  }
}

const ONE_TIME_TTL_MS = 2 * 60 * 1000; // 2 minutes
const BILLING_RETURN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function createTimedSessionToken(email: string, ttlMs: number): string {
  const expiry = (Date.now() + ttlMs).toString();
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = `${email}|${expiry}|${nonce}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}|${signature}`).toString("base64url");
}

function verifyTimedSessionToken(tokenEnc: string): string | null {
  let raw: string;
  try {
    raw = Buffer.from(tokenEnc, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const parts = raw.split("|");
  if (parts.length !== 4) return null;
  const [email, expiryStr, nonce, signature] = parts;
  const payload = `${email}|${expiryStr}|${nonce}`;
  let expected = "";
  try {
    expected = sign(payload);
  } catch {
    return null;
  }
  if (!signaturesMatch(expected, signature)) return null;
  const expiry = parseInt(expiryStr, 10);
  if (Number.isNaN(expiry) || Date.now() > expiry) return null;
  return email;
}

/** One-time token for post-login redirect: exchange in consume API to set session cookie from play-options. */
export function createOneTimeSessionToken(email: string): string {
  return createTimedSessionToken(email, ONE_TIME_TTL_MS);
}

/** Returns email if token is valid and not expired. */
export function verifyOneTimeSessionToken(tokenEnc: string): string | null {
  return verifyTimedSessionToken(tokenEnc);
}

/** Short-lived token embedded in Stripe billing portal return URLs to restore member session. */
export function createBillingReturnToken(email: string): string {
  return createTimedSessionToken(email, BILLING_RETURN_TTL_MS);
}

export function verifyBillingReturnToken(tokenEnc: string): string | null {
  return verifyTimedSessionToken(tokenEnc);
}

type CookieRequestHint = Pick<Request, "headers" | "url"> | null | undefined;

function memberCookieSecure(_request?: CookieRequestHint): boolean {
  if (process.env.COOKIE_INSECURE === "1" || process.env.COOKIE_SECURE === "0") return false;
  return process.env.NODE_ENV === "production";
}

function memberCookieDomain(request?: CookieRequestHint): string | undefined {
  return getProductionCookieDomain(request?.headers.get("host"));
}

function memberSessionCookieOptions(request?: CookieRequestHint) {
  const domain = memberCookieDomain(request);
  return {
    httpOnly: true,
    secure: memberCookieSecure(request),
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    ...(domain ? { domain } : {})
  };
}

/** Set session cookie on a response (use in route handlers so Set-Cookie is on the returned response). */
export function setUserSessionCookieOnResponse(
  response: NextResponse,
  token: string,
  request?: CookieRequestHint
): void {
  response.cookies.set(sessionCookie, token, memberSessionCookieOptions(request));
}

/** Build Set-Cookie header value (value in quotes so characters like | don't break parsing). */
export function buildMemberSessionSetCookieHeader(token: string, request?: CookieRequestHint): string {
  const opts = memberSessionCookieOptions(request);
  const value = `"${token.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const parts = [
    `${sessionCookie}=${value}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    `HttpOnly`,
    `SameSite=${opts.sameSite}`
  ];
  if ("domain" in opts && opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

export async function setUserSession(token: string, request?: CookieRequestHint): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, token, memberSessionCookieOptions(request));
}

export async function clearUserSession(request?: CookieRequestHint): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(sessionCookie)?.value;
  const parsed = raw ? parseSessionToken(normalizeCookieToken(raw)) : null;
  if (parsed?.sessionId) {
    await deleteAuthSession(parsed.sessionId);
  }
  cookieStore.set(sessionCookie, "", { ...memberSessionCookieOptions(request), maxAge: 0 });
}

function normalizeCookieToken(token: string): string {
  let value = token;
  try {
    value = decodeURIComponent(value);
  } catch {
    // leave as-is if not encoded
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return value.replace(/ /g, "+");
}

export async function getUserSessionEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(sessionCookie)?.value;
  if (!raw) return null;
  const parsed = parseSessionToken(normalizeCookieToken(raw));
  if (!parsed) return null;
  const email = normalizeMemberEmail(parsed.email);
  if (parsed.sessionId) {
    if (!(await authSessionActive(parsed.sessionId, "member"))) return null;
  } else if (!(await legacyCredentialAllows(email, parsed.issuedAt, "member"))) {
    return null;
  }
  return email;
}

export async function consumeMemberHandoffToken(token: string, kind: string): Promise<boolean> {
  return consumeAuthToken(token, kind);
}

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
