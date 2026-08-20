import {
  buildOutreachImportNotes,
  importMarksDoNotEmail,
  isMailingListStatus,
  looksLikeAweberSubscriberExport,
  mergeOutreachNotes,
  normalizeImportRow,
  outreachPipelineStatusFromImport,
  parseDelimitedTable,
  pickField
} from "./marketing-import";

describe("marketing-import", () => {
  it("parses CSV with flexible headers", () => {
    const rows = parseDelimitedTable(
      "Full Name,Email,Phone\nJordan Lee,jordan@example.com,555-111-2222\n"
    );
    expect(rows).toHaveLength(1);
    const n = normalizeImportRow(rows[0]);
    expect(n.fullName).toBe("Jordan Lee");
    expect(n.email).toBe("jordan@example.com");
    expect(n.phoneMobile).toBe("555-111-2222");
  });

  it("keeps commas inside quoted CSV cells", () => {
    const rows = parseDelimitedTable('Name,Notes\n"Lee, Jordan","hello, world"\n');
    expect(rows[0].Name).toBe("Lee, Jordan");
    expect(rows[0].Notes).toBe("hello, world");
  });

  it("parses JSON array and object wrappers", () => {
    const fromArray = parseDelimitedTable(
      JSON.stringify([{ name: "A", email: "a@example.com" }])
    );
    expect(fromArray[0].name).toBe("A");
    const fromWrapped = parseDelimitedTable(
      JSON.stringify({ leads: [{ organization: "Metro Fire", email: "wellness@metro.example" }] })
    );
    expect(normalizeImportRow(fromWrapped[0]).organization).toBe("Metro Fire");
  });

  it("picks aliased fields case-insensitively", () => {
    expect(pickField({ First_Name: "Pat" }, "firstName", "first_name")).toBe("Pat");
  });

  it("maps AWeber subscriber exports without using list status as pipeline status", () => {
    const csv = [
      "Email,Name,Signup Date,Unsubscribe Date,Status,Additional Notes,Signup Region,Signup City,Signup Postal Code,Tags",
      'kedems2y@yahoo.com,Kesem Har,04/27/26 7:11PM EDT,04/27/26 7:11PM EDT,Unsubscribed,hello,CA,Northridge,91324,"ltd,ltd-social media"'
    ].join("\n");
    const rows = parseDelimitedTable(csv);
    expect(looksLikeAweberSubscriberExport(rows)).toBe(true);
    const n = normalizeImportRow(rows[0]);
    expect(n.email).toBe("kedems2y@yahoo.com");
    expect(n.fullName).toBe("Kesem Har");
    expect(n.firstName).toBe("Kesem");
    expect(n.lastName).toBe("Har");
    expect(n.city).toBe("Northridge");
    expect(n.state).toBe("CA");
    expect(n.zip).toBe("91324");
    expect(n.notes).toBe("hello");
    expect(n.goals).toEqual(["ltd", "ltd-social media"]);
    expect(n.status).toBe("Unsubscribed");
    expect(isMailingListStatus(n.status)).toBe(true);
    expect(importMarksDoNotEmail(n.status)).toBe(true);
    expect(outreachPipelineStatusFromImport(n.status)).toBe("prospect");
    expect(buildOutreachImportNotes(n)).toContain("Tags: ltd, ltd-social media");
    expect(buildOutreachImportNotes(n)).toContain("AWeber: unsubscribed");
    expect(mergeOutreachNotes("Event lead", "AWeber list")).toBe("Event lead\nAWeber list");
    expect(mergeOutreachNotes("Event lead\nAWeber list", "AWeber list")).toBe(
      "Event lead\nAWeber list"
    );
  });
});
