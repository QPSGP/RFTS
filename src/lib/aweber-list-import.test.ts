import {
  campaignNameForList,
  mergeAweberLeads,
  metaFromAweberFolder,
  parseAweberLeadsCsv,
  parseAweberListFolderName,
  titleCasePersonName
} from "./aweber-list-import";
import { DEFAULT_CAMPAIGN_TEMPLATE } from "./crm-query";
import { looksLikeAweberSubscriberExport, parseDelimitedTable } from "./marketing-import";

describe("aweber-list-import", () => {
  it("parses AWeber folder names", () => {
    expect(parseAweberListFolderName("awlist6111764_1 Stress")).toEqual({
      listId: "6111764",
      title: "1 Stress"
    });
  });

  it("maps goal lists to lead-card templates", () => {
    expect(metaFromAweberFolder("awlist6111764_1 Stress").templateName).toBe(
      "Convert lead card - Stress Management"
    );
    expect(metaFromAweberFolder("awlist6858154_Attract Love-singlescouples").interest).toBe(
      "Attract Love"
    );
    expect(metaFromAweberFolder("awlist5876797_Virtual Small Business Expo 1220").kind).toBe(
      "partner"
    );
    expect(metaFromAweberFolder("awlist4050557_Your Success Newsletter").templateName).toBe(
      DEFAULT_CAMPAIGN_TEMPLATE
    );
  });

  it("parses list CSV Name 1 / Active without treating Active as a partner status", () => {
    const csv = [
      "Email,Name 1,Additional Notes,Status,Verified,tags",
      "pat@example.com,PAT LEE,Stress Management,Active,Verified,"
    ].join("\n");
    const rows = parseDelimitedTable(csv);
    expect(looksLikeAweberSubscriberExport(rows)).toBe(true);
    const leads = parseAweberLeadsCsv(csv);
    expect(leads).toHaveLength(1);
    expect(leads[0].active).toBe(true);
    expect(leads[0].person.fullName).toBe("Pat Lee");
    expect(leads[0].person.firstName).toBe("Pat");
  });

  it("marks Unsubscribed rows inactive and merges list tags by email", () => {
    const stress = metaFromAweberFolder("awlist6111764_1 Stress");
    const memory = metaFromAweberFolder("awlist6111768_2 Memory");
    const merged = mergeAweberLeads([
      {
        meta: stress,
        leads: parseAweberLeadsCsv(
          "Email,Name 1,Status\npat@example.com,Pat,Active\n"
        )
      },
      {
        meta: memory,
        leads: parseAweberLeadsCsv(
          "Email,Name 1,Status\npat@example.com,Pat,Unsubscribed\n"
        )
      }
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].doNotEmail).toBe(false);
    expect(merged[0].activeListTags).toEqual([stress.tag]);
    expect(merged[0].unsubscribedTitles).toEqual(["2 Memory"]);
  });

  it("title-cases ALL CAPS names", () => {
    expect(titleCasePersonName("CARLOS RODARTE")).toBe("Carlos Rodarte");
  });

  it("names campaign parts", () => {
    const meta = metaFromAweberFolder("awlist4050557_Your Success Newsletter");
    expect(campaignNameForList(meta, 1, 1)).toContain("AWeber · Your Success Newsletter");
    expect(campaignNameForList(meta, 2, 5)).toContain("(2/5)");
  });
});
