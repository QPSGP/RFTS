import { buildSessionToken, parseSessionToken, SESSION_MAX_AGE_MS } from "@/lib/session-token";

describe("session tokens", () => {
  const previous = process.env.SESSION_SECRET;

  beforeAll(() => {
    process.env.SESSION_SECRET = "test-session-secret";
  });

  afterAll(() => {
    process.env.SESSION_SECRET = previous;
  });

  it("accepts a legacy cookie with no session id", () => {
    const token = buildSessionToken("member@example.com", null);
    const parsed = parseSessionToken(token);
    expect(parsed?.email).toBe("member@example.com");
    expect(parsed?.sessionId).toBeNull();
  });

  it("accepts a tracked session id", () => {
    const token = buildSessionToken("member@example.com", "abc123");
    const parsed = parseSessionToken(token);
    expect(parsed?.sessionId).toBe("abc123");
  });

  it("rejects a token older than 30 days", () => {
    const token = buildSessionToken("member@example.com", null);
    const parsed = parseSessionToken(token);
    expect(parsed).not.toBeNull();
    const issuedAt = parsed!.issuedAt;
    const realNow = Date.now;
    Date.now = () => issuedAt + SESSION_MAX_AGE_MS + 1000;
    try {
      expect(parseSessionToken(token)).toBeNull();
    } finally {
      Date.now = realNow;
    }
  });

  it("rejects a bad signature", () => {
    const token = buildSessionToken("member@example.com", null);
    expect(parseSessionToken(`${token}00`)).toBeNull();
  });
});
