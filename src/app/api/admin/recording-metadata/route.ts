import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import {
  lookupRecordingDescription,
  metadataFromFileName,
  titleFromFileName
} from "@/lib/library-metadata";

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get("fileName")?.trim() || "";
  const sku = searchParams.get("sku")?.trim().toUpperCase() || "";

  if (fileName) {
    return NextResponse.json(metadataFromFileName(fileName));
  }

  if (sku) {
    return NextResponse.json({
      skuCode: sku,
      title: titleFromFileName(sku),
      description: lookupRecordingDescription(sku),
      coverUrl: ""
    });
  }

  return NextResponse.json({ error: "Provide fileName or sku." }, { status: 400 });
}
