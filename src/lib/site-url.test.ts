import { canonicalHostRedirectUrl } from "@/lib/site-url";

describe("canonical host redirect", () => {
  it("sends the old Vercel homepage to the apex and keeps the query", () => {
    expect(canonicalHostRedirectUrl("rfts-7d4w.vercel.app", "/", "?ref=TERRY01")).toBe(
      "https://reachforthestars.today/?ref=TERRY01"
    );
  });

  it("sends www paths to the apex", () => {
    expect(canonicalHostRedirectUrl("www.reachforthestars.today", "/member/login", "")).toBe(
      "https://reachforthestars.today/member/login"
    );
  });

  it("leaves the apex and preview hosts alone", () => {
    expect(canonicalHostRedirectUrl("reachforthestars.today", "/", "")).toBeNull();
    expect(
      canonicalHostRedirectUrl("rfts-7d4w-git-main-richard-weathermans-projects.vercel.app", "/", "")
    ).toBeNull();
  });
});
