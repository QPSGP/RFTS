import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { getEventLead } from "@/lib/event-leads-db";
import { fetchEventLeadScanFromBlob } from "@/lib/event-lead-scan-blob";
import { leadScanContentType, resolveEventLeadScanFile } from "@/lib/event-lead-scan";

function imageResponse(buffer: Buffer, contentType: string, filename: string) {
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store"
    }
  });
}

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
  if (filePath) {
    const buffer = fs.readFileSync(filePath);
    return imageResponse(buffer, leadScanContentType(filePath), path.basename(filePath));
  }

  const fromBlob = await fetchEventLeadScanFromBlob(lead.sourceScanPath, { preferPreview });
  if (fromBlob) {
    return imageResponse(fromBlob.buffer, fromBlob.contentType, fromBlob.filename);
  }

  return NextResponse.json(
    {
      error:
        "Scan file is not on this server. Upload the JPEGs with npm run upload:lead-scans so production can open them."
    },
    { status: 404 }
  );
}
