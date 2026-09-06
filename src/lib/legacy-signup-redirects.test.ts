import fs from "fs";
import path from "path";

const SIGNUP_DESTINATION = "/signup/step-1-subscription-selection";

describe("legacy signup path redirects", () => {
  it("sends /sign-up and /signup to subscription selection in next.config.js", async () => {
    const nextConfig = require("../../next.config.js") as {
      redirects: () => Promise<Array<{ source: string; destination: string; permanent: boolean }>>;
    };
    const redirects = await nextConfig.redirects();
    for (const source of ["/sign-up", "/signup"]) {
      expect(redirects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source,
            destination: SIGNUP_DESTINATION,
            permanent: true
          })
        ])
      );
    }
  });

  it("sends /sign-up and /signup to subscription selection in vercel.json", () => {
    const raw = fs.readFileSync(path.join(__dirname, "../../vercel.json"), "utf8");
    const vercel = JSON.parse(raw) as {
      redirects?: Array<{ source: string; destination: string; permanent?: boolean }>;
    };
    const redirects = vercel.redirects ?? [];
    for (const source of ["/sign-up", "/signup"]) {
      expect(redirects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source,
            destination: SIGNUP_DESTINATION,
            permanent: true
          })
        ])
      );
    }
  });
});
