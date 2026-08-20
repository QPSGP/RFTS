import {
  applyCrmExportQuery,
  buildFlatContactRows,
  csvEscapeCell,
  filterOutreachTargets,
  recordsToCsv,
  type CrmExportTables
} from "./crm-export";
import type { OutreachContact, OutreachTarget } from "./db";

function target(partial: Partial<OutreachTarget> & Pick<OutreachTarget, "id" | "organization">): OutreachTarget {
  return {
    targetType: "organization",
    category: null,
    persona: null,
    entryPath: null,
    contact: null,
    refCode: null,
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
    isPrimary: false,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...partial
  };
}

const emptyTables = (): CrmExportTables => ({
  targets: [],
  contacts: [],
  activities: [],
  eventLeads: [],
  emailEvents: [],
  templates: []
});

describe("crm-export", () => {
  it("escapes commas and quotes in CSV cells", () => {
    expect(csvEscapeCell("plain")).toBe("plain");
    expect(csvEscapeCell('Hello, "world"')).toBe('"Hello, ""world"""');
    const csv = recordsToCsv(
      [{ name: "Lee, Jordan", note: "line\nbreak" }],
      ["name", "note"]
    );
    expect(csv).toContain('"Lee, Jordan"');
    expect(csv).toContain('"line\nbreak"');
  });

  it("filters targets by status, due follow-up, and do-not-email", () => {
    const now = Date.parse("2026-08-19T12:00:00.000Z");
    const rows = [
      target({ id: "1", organization: "A", status: "prospect", doNotEmail: false }),
      target({
        id: "2",
        organization: "B",
        status: "contacted",
        followUpAt: "2026-08-20T00:00:00.000Z"
      }),
      target({
        id: "3",
        organization: "C",
        status: "contacted",
        followUpAt: "2026-09-01T00:00:00.000Z"
      }),
      target({ id: "4", organization: "D", status: "prospect", doNotEmail: true })
    ];
    expect(filterOutreachTargets(rows, { status: "prospect" }, now).map((t) => t.id)).toEqual([
      "1",
      "4"
    ]);
    expect(filterOutreachTargets(rows, { status: "due" }, now).map((t) => t.id)).toEqual(["2"]);
    expect(filterOutreachTargets(rows, { doNotEmail: true }, now).map((t) => t.id)).toEqual(["4"]);
  });

  it("builds one spreadsheet row per contact and keeps targets with no contacts", () => {
    const targets = [
      target({ id: "t1", organization: "Metro Fire" }),
      target({ id: "t2", organization: "Solo Coach" })
    ];
    const contacts = [
      contact({ id: "c1", targetId: "t1", name: "Pat", email: "pat@metro.example", isPrimary: true }),
      contact({ id: "c2", targetId: "t1", name: "Jordan", email: "jordan@metro.example" })
    ];
    const rows = buildFlatContactRows(targets, contacts);
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.targetId === "t1")).toHaveLength(2);
    expect(rows.find((r) => r.targetId === "t2")?.contactId).toBeNull();
  });

  it("cascades target status filters onto contacts", () => {
    const tables: CrmExportTables = {
      ...emptyTables(),
      targets: [
        target({ id: "t1", organization: "Keep", status: "prospect" }),
        target({ id: "t2", organization: "Drop", status: "paused" })
      ],
      contacts: [
        contact({ id: "c1", targetId: "t1", name: "Keep contact" }),
        contact({ id: "c2", targetId: "t2", name: "Drop contact" })
      ]
    };
    const filtered = applyCrmExportQuery(tables, { dataset: "contacts", status: "prospect" });
    expect(filtered.contacts.map((c) => c.id)).toEqual(["c1"]);
  });

  it("searches organization and email with q", () => {
    const tables: CrmExportTables = {
      ...emptyTables(),
      targets: [target({ id: "t1", organization: "Metro Fire", contact: "desk@metro.example" })],
      contacts: [
        contact({ id: "c1", targetId: "t1", name: "Pat", email: "pat@metro.example" })
      ]
    };
    const byOrg = applyCrmExportQuery(tables, { dataset: "targets", q: "metro" });
    expect(byOrg.targets).toHaveLength(1);
    const miss = applyCrmExportQuery(tables, { dataset: "targets", q: "zzz" });
    expect(miss.targets).toHaveLength(0);
    const byEmail = applyCrmExportQuery(tables, { dataset: "contacts", q: "pat@" });
    expect(byEmail.contacts).toHaveLength(1);
  });
});
