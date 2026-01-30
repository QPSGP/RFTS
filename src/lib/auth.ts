import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";

const sessionCookie = "rfts_session";

const getSecret = () => process.env.SESSION_SECRET || "dev-secret";

export const verifyAdminCredentials = async (
  email: string,
  password: string
) => {
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

export const setSession = (token: string) => {
  const cookieStore = cookies();
  cookieStore.set(sessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
};

export const clearSession = () => {
  const cookieStore = cookies();
  cookieStore.set(sessionCookie, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
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
