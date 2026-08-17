import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { listMarketingEmailEvents } from "@/lib/email-delivery-events";

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") || "50");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 50;
  const events = await listMarketingEmailEvents({ limit });
  const res = NextResponse.json({ events });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}
