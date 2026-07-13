import { buildAffiliatePageUrl } from "@/lib/affiliate-code";
import { buildAffiliateShareLinks } from "@/lib/affiliate-landing-links";

describe("affiliate-landing-links", () => {
  it("builds signup and landing URLs with ref", () => {
    const links = buildAffiliateShareLinks("6051C794", "https://reachforthestars.today");
    const signup = links.find((link) => link.kind === "signup");
    const sleep = links.find((link) => link.path === "/sleep-meditation");
    expect(signup?.url).toBe(
      "https://reachforthestars.today/signup/step-1-subscription-selection?ref=6051C794"
    );
    expect(sleep?.url).toBe("https://reachforthestars.today/sleep-meditation?ref=6051C794");
  });

  it("appends ref to paths that already have query params", () => {
    expect(buildAffiliatePageUrl("/foo?x=1", "ABCD1234", "https://example.com")).toBe(
      "https://example.com/foo?x=1&ref=ABCD1234"
    );
  });
});
