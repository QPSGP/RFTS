import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import {
  buildMemberExportCsvString,
  buildMemberExportHtmlString,
  buildScheduleAlgorithmForMember
} from "@/lib/schedule-algorithm-export";
import { SCHEDULE_MAX_NIGHTS } from "@/lib/schedule-limits";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const bodySchema = z.object({
  email: z.string().min(3).max(320),
  nights: z.number().int().min(1).max(SCHEDULE_MAX_NIGHTS).optional().default(42),
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
  const { email, nights, format } = parsed.data;

  let result: Awaited<ReturnType<typeof buildScheduleAlgorithmForMember>>;
  try {
    result = await buildScheduleAlgorithmForMember(email, nights);
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
        email: result.email,
        label: result.label,
        subscriptionTier: result.subscriptionTier,
        goalsCount: result.goalsCount,
        assignedAudioCount: result.assignedAudioCount,
        playsPerNight: result.playsPerNight,
        nights: result.nights,
        maxN: result.maxN,
        warnings: result.warnings
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (format === "csv") {
    const csv = buildMemberExportCsvString(result);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="schedule-algorithm.csv"`,
        "Cache-Control": "no-store"
      }
    });
  }

  const html = buildMemberExportHtmlString(result);
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="schedule-algorithm.html"`,
      "Cache-Control": "no-store"
    }
  });
}
