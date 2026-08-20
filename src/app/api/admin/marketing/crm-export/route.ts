import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import {
  CRM_EXPORT_COLUMNS,
  CRM_EXPORT_DATASETS,
  buildCrmCsvFiles,
  buildCrmExport,
  crmExportFilename,
  recordsToCsv,
  rowsForDataset,
  type CrmExportDataset
} from "@/lib/crm-export";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const querySchema = z.object({
  dataset: z.enum(CRM_EXPORT_DATASETS).default("all"),
  format: z.enum(["csv", "json"]).default("csv"),
  status: z.string().trim().max(40).optional(),
  doNotEmail: z.enum(["true", "false", ""]).optional(),
  eventKey: z.string().trim().max(120).optional(),
  formType: z.string().trim().max(40).optional(),
  eventStatus: z.string().trim().max(40).optional(),
  q: z.string().trim().max(200).optional()
});

function parseDoNotEmail(raw: string | undefined): boolean | null {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

function jsonAttachment(body: unknown, filename: string) {
  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}

function csvAttachment(csv: string, filename: string) {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    dataset: url.searchParams.get("dataset") || undefined,
    format: url.searchParams.get("format") || undefined,
    status: url.searchParams.get("status") || undefined,
    doNotEmail: url.searchParams.get("doNotEmail") || undefined,
    eventKey: url.searchParams.get("eventKey") || undefined,
    formType: url.searchParams.get("formType") || undefined,
    eventStatus: url.searchParams.get("eventStatus") || undefined,
    q: url.searchParams.get("q") || undefined
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid export query." }, { status: 400 });
  }

  const dataset = parsed.data.dataset as CrmExportDataset;
  const format = parsed.data.format;
  const query = {
    dataset,
    status: parsed.data.status || "all",
    doNotEmail: parseDoNotEmail(parsed.data.doNotEmail),
    eventKey: parsed.data.eventKey || null,
    formType: parsed.data.formType || null,
    eventStatus: parsed.data.eventStatus || null,
    q: parsed.data.q || null
  };

  const result = await buildCrmExport(query);
  const filename = crmExportFilename(dataset, format);

  if (dataset === "all") {
    if (format === "json") {
      return jsonAttachment(
        {
          generatedAt: result.generatedAt,
          query: result.query,
          counts: result.counts,
          tables: result.tables
        },
        filename
      );
    }
    const files = buildCrmCsvFiles(result.tables);
    return NextResponse.json(
      {
        generatedAt: result.generatedAt,
        query: result.query,
        counts: result.counts,
        files
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate"
        }
      }
    );
  }

  const rows = rowsForDataset(result.tables, dataset);
  if (format === "json") {
    return jsonAttachment(
      {
        generatedAt: result.generatedAt,
        dataset,
        query: result.query,
        rowCount: rows.length,
        rows
      },
      filename
    );
  }

  const csv = recordsToCsv(rows, CRM_EXPORT_COLUMNS[dataset]);
  return csvAttachment(csv, filename);
}
