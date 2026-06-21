import { isAuthorizedCronRequest } from "./cron-auth";

function mockRequest(headers: Record<string, string>): Request {
  return {
    headers: {
      get(name: string) {
        const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
        return key ? headers[key] : null;
      }
    }
  } as Request;
}

describe("isAuthorizedCronRequest", () => {
  const secret = "test-cron-secret";

  beforeEach(() => {
    process.env.CRON_SECRET = secret;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("accepts Bearer CRON_SECRET", () => {
    const request = mockRequest({ authorization: `Bearer ${secret}` });
    expect(isAuthorizedCronRequest(request)).toBe(true);
  });

  it("accepts x-cron-secret header", () => {
    const request = mockRequest({ "x-cron-secret": secret });
    expect(isAuthorizedCronRequest(request)).toBe(true);
  });

  it("rejects missing or wrong secret", () => {
    expect(isAuthorizedCronRequest(mockRequest({}))).toBe(false);
    expect(isAuthorizedCronRequest(mockRequest({ authorization: "Bearer wrong" }))).toBe(false);
  });

  it("rejects when CRON_SECRET is not configured", () => {
    delete process.env.CRON_SECRET;
    const request = mockRequest({ authorization: `Bearer ${secret}` });
    expect(isAuthorizedCronRequest(request)).toBe(false);
  });
});
