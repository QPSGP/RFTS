import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { runDueOutreachNurture } from "@/lib/outreach-nurture";

/**
 * Weekly interest nurture (Vercel Cron: Mondays 15:00 UTC).
 * Sends the next lined-up interest email for each due CRM sequence.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await runDueOutreachNurture({
    createdByEmail: "cron:outreach-nurture"
  });

  console.info("[cron outreach-nurture]", JSON.stringify(result));

  return NextResponse.json({ ok: true, ...result });
}
