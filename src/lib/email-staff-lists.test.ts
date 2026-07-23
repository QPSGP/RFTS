import { defaultEmailsForList, normalizeEmailList } from "./email-staff-lists";

describe("email-staff-lists", () => {
  it("normalizes and dedupes emails case-insensitively", () => {
    expect(
      normalizeEmailList([" A@x.com ", "a@x.com", "", "b@y.com"])
    ).toEqual(["A@x.com", "b@y.com"]);
  });

  it("seeds welcome CC defaults when env unset", () => {
    const prev = process.env.WELCOME_EMAIL_CC;
    delete process.env.WELCOME_EMAIL_CC;
    expect(defaultEmailsForList("welcome_cc")).toEqual([
      "terry_bg@msn.com",
      "Richard@richardleeweatherman.com"
    ]);
    if (prev === undefined) delete process.env.WELCOME_EMAIL_CC;
    else process.env.WELCOME_EMAIL_CC = prev;
  });
});
