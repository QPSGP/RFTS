import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { loadCrmContactRows } from "@/lib/outreach-campaigns";
import {
  filterCrmContactRows,
  groupRowsBySuggestedTemplate,
  suggestedProcessForRow,
  tagsFromNotes,
  type CrmContactQuery
} from "@/lib/crm-query";

function parseBool(raw: string | null): boolean | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "yes" || v === "1") return true;
  if (v === "false" || v === "no" || v === "0") return false;
  return null;
}

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const query: CrmContactQuery = {
    q: url.searchParams.get("q"),
    status: url.searchParams.get("status"),
    persona: url.searchParams.get("persona"),
    category: url.searchParams.get("category"),
    interest: url.searchParams.get("interest"),
    entryPath: url.searchParams.get("entryPath"),
    targetType: url.searchParams.get("targetType"),
    doNotEmail: parseBool(url.searchParams.get("doNotEmail")),
    hasEmail: parseBool(url.searchParams.get("hasEmail")),
    tag: url.searchParams.get("tag")
  };

  const all = await loadCrmContactRows();
  const rows = filterCrmContactRows(all, query);
  const unique = (values: Array<string | null | undefined>) =>
    [...new Set(values.map((v) => (v || "").trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );

  const tags = unique(all.flatMap((row) => tagsFromNotes(`${row.notes || ""}\n${row.contactNotes || ""}`)));
  const withSuggestion = rows.map((row) => ({
    ...row,
    suggested: suggestedProcessForRow(row)
  }));
  const groups = groupRowsBySuggestedTemplate(rows.filter((r) => r.email && !r.doNotEmail)).map(
    (g) => ({ templateName: g.templateName, count: g.rows.length })
  );

  const res = NextResponse.json({
    rows: withSuggestion,
    total: withSuggestion.length,
    groups,
    facets: {
      personas: unique(all.map((r) => r.persona)),
      categories: unique(all.map((r) => r.category)),
      interests: unique(all.map((r) => r.interest)),
      entryPaths: unique(all.map((r) => r.entryPath)),
      statuses: unique(all.map((r) => r.status)),
      tags
    }
  });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}
