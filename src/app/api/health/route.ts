import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || null,
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || null
  });
}
