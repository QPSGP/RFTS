import {
  buildUpsertMemberProfilePayload,
  memberProfilePatchSchema,
  memberProfileToDraft
} from "@/lib/member-profile-form";
import type { MemberProfile } from "@/lib/db";

describe("member-profile-form", () => {
  it("maps stored profile to draft", () => {
    const draft = memberProfileToDraft({
      userId: "u1",
      firstName: "Alex",
      lastName: "Rivera",
      yearBorn: 1985,
      birthDate: "1985-06-15",
      timeZone: "Pacific Time",
      hadLgdSession: true
    } as MemberProfile);
    expect(draft.firstName).toBe("Alex");
    expect(draft.birthDate).toBe("1985-06-15");
    expect(draft.hadLgdSession).toBe(true);
  });

  it("clears adult consent when member is under 18", () => {
    const currentYear = new Date().getFullYear();
    const payload = buildUpsertMemberProfilePayload(
      "u1",
      null,
      {
        birthDate: `${currentYear - 10}-01-01`,
        adultConsent: true
      }
    );
    expect(payload.adultConsent).toBe(false);
  });

  it("accepts profile patch schema fields", () => {
    const parsed = memberProfilePatchSchema.safeParse({
      firstName: "Sam",
      notes: "Facilitator note"
    });
    expect(parsed.success).toBe(true);
  });
});
