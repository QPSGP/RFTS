import { saveMemberAudioOrder, orderSaveErrorMessage, readPgError } from "@/lib/member-audio-order";

describe("saveMemberAudioOrder validation", () => {
  it("orderSaveErrorMessage handles duplicate key hint", () => {
    const msg = orderSaveErrorMessage({
      code: "23505",
      constraint: "member_audio_assignments_pkey",
      detail: "library_item"
    });
    expect(msg).toContain("legacy PRIMARY KEY");
  });

  it("readPgError extracts postgres code from nested cause", () => {
    const pg = readPgError({ cause: { code: "23503", message: "fk violation" } });
    expect(pg?.code).toBe("23503");
  });
});

// saveMemberAudioOrder DB integration is covered by admin/facilitator API routes.
