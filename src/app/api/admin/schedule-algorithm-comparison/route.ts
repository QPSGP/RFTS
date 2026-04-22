import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import {
  buildComparisonCsvString,
  buildComparisonHtmlString,
  buildScheduleAlgorithmComparison
} from "@/lib/schedule-algorithm-comparison";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const bodySchema = z.object({
  goldEmail: z.string().min(3).max(320),
  managedEmail: z.string().min(3).max(320),
  nights: z.number().int().min(1).max(366).optional().default(42),
  /** "csv" | "html" | "json" — json returns table + metadata for in-app preview. */
  format: z.enum(["csv", "html", "json"]).default("json")
});

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { goldEmail, managedEmail, nights, format } = parsed.data;

  let result: Awaited<ReturnType<typeof buildScheduleAlgorithmComparison>>;
  try {
    result = await buildScheduleAlgorithmComparison(goldEmail, managedEmail, nights);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (format === "json") {
    return NextResponse.json(
      {
        header: result.header,
        rows: result.rows,
        rowHighlight: result.rowHighlight,
        goldEmail: result.goldEmail,
        managedEmail: result.managedEmail,
        goldLabel: result.goldLabel,
        managedLabel: result.managedLabel,
        nights: result.nights,
        maxN: result.maxN,
        warnings: result.warnings,
        assignedAudioCount: result.assignedAudioCount
      },
      {
        headers: { "Cache-Control": "no-store" }
      }
    );
  }

  if (format === "csv") {
    const csv = buildComparisonCsvString(result);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="schedule-algorithm-comparison.csv"`,
        "Cache-Control": "no-store"
      }
    });
  }

  const html = buildComparisonHtmlString(result);
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="schedule-algorithm-comparison.html"`,
      "Cache-Control": "no-store"
    }
  });
}
