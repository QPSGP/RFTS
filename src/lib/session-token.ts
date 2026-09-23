import crypto from "crypto";

export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type ParsedSessionToken = {
  email: string;
  issuedAt: number;
  /** Null for cookies issued before session ids existed. Those stay valid until they expire or the password changes. */
  sessionId: string | null;
};

export function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") return null;
  return "dev-secret";
}

export function signaturesMatch(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function parseSessionToken(token: string): ParsedSessionToken | null {
  const secret = getSessionSecret();
  if (!secret) return null;
  const parts = token.split("|");
  let email = "";
  let issuedAtStr = "";
  let sessionId: string | null = null;
  let signature = "";
  let payload = "";

  if (parts.length === 5 && parts[0] === "v2") {
    email = parts[1] || "";
    issuedAtStr = parts[2] || "";
    sessionId = parts[3] || "";
    signature = parts[4] || "";
    payload = `v2|${email}|${issuedAtStr}|${sessionId}`;
  } else if (parts.length === 4) {
    email = parts[0] || "";
    issuedAtStr = parts[1] || "";
    const nonce = parts[2] || "";
    signature = parts[3] || "";
    sessionId = null;
    payload = `${email}|${issuedAtStr}|${nonce}`;
  } else {
    return null;
  }

  const issuedAt = parseInt(issuedAtStr, 10);
  if (!email || !signature || Number.isNaN(issuedAt)) return null;
  if (sessionId === "") return null;
  const age = Date.now() - issuedAt;
  if (age > SESSION_MAX_AGE_MS || issuedAt > Date.now() + 60_000) return null;
  const expected = signPayload(payload, secret);
  if (!signaturesMatch(expected, signature)) return null;
  return { email, issuedAt, sessionId };
}

/** sessionId null keeps the legacy shape for callers that could not store an id. */
export function buildSessionToken(email: string, sessionId: string | null): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("SESSION_SECRET is not set.");
  }
  const issuedAt = Date.now().toString();
  if (sessionId) {
    const payload = `v2|${email}|${issuedAt}|${sessionId}`;
    return `${payload}|${signPayload(payload, secret)}`;
  }
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = `${email}|${issuedAt}|${nonce}`;
  return `${payload}|${signPayload(payload, secret)}`;
}
