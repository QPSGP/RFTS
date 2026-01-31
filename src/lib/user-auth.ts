import crypto from "crypto";
import { cookies } from "next/headers";

const sessionCookie = "rfts_user_session";

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

export const setUserSession = (token: string) => {
  const cookieStore = cookies();
  cookieStore.set(sessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
};

export const clearUserSession = () => {
  const cookieStore = cookies();
  cookieStore.set(sessionCookie, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
};

export const getUserSessionEmail = () => {
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
