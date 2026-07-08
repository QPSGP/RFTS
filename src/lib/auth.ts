import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminByEmail, getModeratorByEmail, getUserByEmail } from "@/lib/db";
import { getProductionCookieDomain } from "@/lib/site-url";

const sessionCookie = "rfts_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
const ADMIN_BILLING_RETURN_TTL_MS = 30 * 60 * 1000; // 30 minutes

const getSecret = () => process.env.SESSION_SECRET || "dev-secret";

export const verifyAdminCredentials = async (
  email: string,
  password: string
) => {
  const dbAdmin = await getAdminByEmail(email);
  if (dbAdmin && dbAdmin.status === "active" && dbAdmin.passwordHash) {
    return bcrypt.compare(password, dbAdmin.passwordHash);
  }
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminEmail || !adminPasswordHash) {
    return false;
  }
  if (email.toLowerCase() !== adminEmail.toLowerCase()) {
    return false;
  }
  return bcrypt.compare(password, adminPasswordHash);
};

export const verifyModeratorCredentials = async (
  email: string,
  password: string
) => {
  const moderator = await getModeratorByEmail(email);
  if (!moderator || moderator.status !== "active") {
    return false;
  }
  return bcrypt.compare(password, moderator.passwordHash);
};

const sign = (value: string) => {
  return crypto
    .createHmac("sha256", getSecret())
    .update(value)
    .digest("hex");
};

export const createSessionToken = (email: string) => {
  const issuedAt = Date.now().toString();
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = `${email}|${issuedAt}|${nonce}`;
  const signature = sign(payload);
  return `${payload}|${signature}`;
};

function createTimedStaffToken(email: string, ttlMs: number): string {
  const expiry = (Date.now() + ttlMs).toString();
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = `${email}|${expiry}|${nonce}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}|${signature}`).toString("base64url");
}

function verifyTimedStaffToken(tokenEnc: string): string | null {
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
  if (sign(payload) !== signature) return null;
  const expiry = parseInt(expiryStr, 10);
  if (Number.isNaN(expiry) || Date.now() > expiry) return null;
  return email;
}

/** Short-lived token in Stripe return URLs to restore admin session after cross-site redirect. */
export function createAdminBillingReturnToken(email: string): string {
  return createTimedStaffToken(email, ADMIN_BILLING_RETURN_TTL_MS);
}

export function verifyAdminBillingReturnToken(tokenEnc: string): string | null {
  return verifyTimedStaffToken(tokenEnc);
}

type CookieRequestHint = Pick<Request, "headers" | "url"> | null | undefined;

function staffCookieSecure(request?: CookieRequestHint): boolean {
  if (process.env.COOKIE_INSECURE === "1" || process.env.COOKIE_SECURE === "0") return false;
  if (process.env.NODE_ENV !== "production") return false;
  if (request) {
    const xf = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
    if (xf === "http") return false;
    try {
      if (new URL(request.url).protocol === "http:") return false;
    } catch {
      /* ignore */
    }
  }
  return true;
}

function staffCookieDomain(request?: CookieRequestHint): string | undefined {
  return getProductionCookieDomain(request?.headers.get("host"));
}

function staffSessionCookieOptions(request?: CookieRequestHint) {
  const domain = staffCookieDomain(request);
  return {
    httpOnly: true,
    secure: staffCookieSecure(request),
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    ...(domain ? { domain } : {})
  };
}

export function setSessionCookieOnResponse(
  response: NextResponse,
  token: string,
  request?: CookieRequestHint
): void {
  response.cookies.set(sessionCookie, token, staffSessionCookieOptions(request));
}

export const setSession = (token: string) => {
  const cookieStore = cookies();
  cookieStore.set(sessionCookie, token, staffSessionCookieOptions());
};

export const clearSession = () => {
  const cookieStore = cookies();
  cookieStore.set(sessionCookie, "", { ...staffSessionCookieOptions(), maxAge: 0 });
};

export const getSessionEmail = () => {
  const cookieStore = cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (!token) {
    return null;
  }
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

export const getSessionRole = async () => {
  const email = getSessionEmail();
  if (!email) {
    return null;
  }
  const dbAdmin = await getAdminByEmail(email);
  if (dbAdmin && dbAdmin.status === "active") {
    return "admin";
  }
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
    return "admin";
  }
  const moderator = await getModeratorByEmail(email);
  if (moderator && moderator.status === "active") {
    return "moderator";
  }
  return null;
};

export const isAdminSession = async () => (await getSessionRole()) === "admin";

export const isModeratorSession = async () => {
  const role = await getSessionRole();
  return role === "moderator" || role === "admin";
};

export const getSessionConsoleType = async (): Promise<"admin" | "moderator" | "member" | null> => {
  const role = await getSessionRole();
  if (role === "admin") return "admin";
  if (role === "moderator") return "moderator";
  const { getUserSessionEmail } = await import("./user-auth");
  const email = await getUserSessionEmail();
  if (!email) return null;
  const user = await getUserByEmail(email);
  if (!user) return null;
  return "member";
};
