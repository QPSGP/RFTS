import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { getEventLead } from "@/lib/event-leads-db";
import { leadScanContentType, resolveEventLeadScanFile } from "@/lib/event-lead-scan";

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing lead id." }, { status: 400 });
  }

  const lead = await getEventLead(id);
  if (!lead) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!lead.sourceScanPath?.trim()) {
    return NextResponse.json({ error: "This lead has no scan image." }, { status: 404 });
  }

  const preferPreview = url.searchParams.get("full") !== "1";
  const filePath = resolveEventLeadScanFile(lead.sourceScanPath, { preferPreview });
  if (!filePath) {
    return NextResponse.json(
      {
        error:
          "Scan file is not on this server. Images live under docs/lead-card-scans and are not deployed to Vercel."
      },
      { status: 404 }
    );
  }

  const buffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": leadScanContentType(filePath),
      "Content-Length": String(buffer.length),
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
