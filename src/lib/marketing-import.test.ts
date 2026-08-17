import {
  normalizeImportRow,
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
});
