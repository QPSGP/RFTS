import { buildFlatContactRows } from "./crm-export";
import {
  DEFAULT_CAMPAIGN_TEMPLATE,
  filterCrmContactRows,
  groupRowsBySuggestedTemplate,
  suggestedProcessForRow,
  tagsFromNotes
} from "./crm-query";
import type { OutreachContact, OutreachTarget } from "./db";

function target(partial: Partial<OutreachTarget> & Pick<OutreachTarget, "id" | "organization">): OutreachTarget {
  return {
    targetType: "individual",
    category: null,
    persona: null,
    entryPath: null,
    contact: null,
    refCode: "6051C794",
    status: "prospect",
    notes: null,
    interest: null,
    audienceSize: null,
    decisionTimeline: null,
    followUpAt: null,
    doNotEmail: false,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...partial
  };
}

function contact(
  partial: Partial<OutreachContact> & Pick<OutreachContact, "id" | "targetId" | "name">
): OutreachContact {
  return {
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    phoneMobile: null,
    roleTitle: null,
    preferredTimes: null,
    linkedinUrl: null,
    instagramUrl: null,
    facebookUrl: null,
    xUrl: null,
    websiteUrl: null,
    notes: null,
    isPrimary: true,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...partial
  };
}

describe("crm-query", () => {
  const rows = buildFlatContactRows(
    [
      target({
        id: "t1",
        organization: "Pat Lee",
        persona: "Chris - Spiritual Entrepreneur",
        category: "Coaches, studios & practitioners",
        interest: "Attract Love",
        notes: "AWeber list | Tags: ltd, ltd-social media",
        status: "prospect",
        doNotEmail: false
      }),
      target({
        id: "t2",
        organization: "Sam Unsub",
        notes: "AWeber: unsubscribed",
        doNotEmail: true
      }),
      target({
        id: "t3",
        organization: "No Process",
        status: "contacted"
      })
    ],
    [
      contact({
        id: "c1",
        targetId: "t1",
        name: "Pat Lee",
        firstName: "Pat",
        email: "pat@example.com"
      }),
      contact({
        id: "c2",
        targetId: "t2",
        name: "Sam Unsub",
        email: "sam@example.com"
      }),
      contact({
        id: "c3",
        targetId: "t3",
        name: "No Process",
        email: "none@example.com"
      })
    ]
  );

  it("reads AWeber tags from notes", () => {
    expect(tagsFromNotes("Tags: ltd, ltd-social media")).toEqual(["ltd", "ltd-social media"]);
  });

  it("filters by search, persona, do-not-email, and tag", () => {
    expect(filterCrmContactRows(rows, { q: "pat@" }).map((r) => r.contactId)).toEqual(["c1"]);
    expect(filterCrmContactRows(rows, { persona: "Chris - Spiritual Entrepreneur" })).toHaveLength(
      1
    );
    expect(filterCrmContactRows(rows, { doNotEmail: false, hasEmail: true })).toHaveLength(2);
    expect(filterCrmContactRows(rows, { tag: "ltd" }).map((r) => r.email)).toEqual([
      "pat@example.com"
    ]);
    expect(filterCrmContactRows(rows, { status: "contacted" }).map((r) => r.organization)).toEqual([
      "No Process"
    ]);
  });

  it("suggests a lead-card template when interest is known", () => {
    const suggested = suggestedProcessForRow(rows[0]);
    expect(suggested.canAutoSetup).toBe(true);
    expect(suggested.reason).toBe("interest");
    expect(suggested.templateName).toBe("Convert lead card - Attract Love");
  });

  it("does not auto-setup unsubscribed or email-only rows", () => {
    expect(suggestedProcessForRow(rows[1])).toMatchObject({
      canAutoSetup: false,
      reason: "do_not_email"
    });
    expect(suggestedProcessForRow(rows[2])).toMatchObject({
      canAutoSetup: false,
      reason: "need_template"
    });
  });

  it("groups auto-setup rows by template", () => {
    const groups = groupRowsBySuggestedTemplate(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].templateName).toBe("Convert lead card - Attract Love");
    expect(groups[0].rows).toHaveLength(1);
  });

  it("falls back to the starter conversion email when process fields exist without a mapped interest", () => {
    const [row] = buildFlatContactRows(
      [
        target({
          id: "t4",
          organization: "Jordan",
          persona: "Chris - Spiritual Entrepreneur",
          category: "Coaches, studios & practitioners",
          entryPath: "Facilitator / Managed"
        })
      ],
      [
        contact({
          id: "c4",
          targetId: "t4",
          name: "Jordan",
          email: "jordan@example.com"
        })
      ]
    );
    expect(suggestedProcessForRow(row)).toMatchObject({
      canAutoSetup: true,
      templateName: DEFAULT_CAMPAIGN_TEMPLATE,
      reason: "process_fields"
    });
  });
});
