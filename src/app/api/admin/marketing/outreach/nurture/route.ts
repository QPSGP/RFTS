import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import { listEventLeads } from "@/lib/event-leads-db";
import { getOutreachTarget } from "@/lib/db";
import {
  enrollOutreachNurture,
  listNurtureWithTargets,
  sendNextNurtureEmail
} from "@/lib/outreach-nurture";
import { getOutreachNurtureByTargetId } from "@/lib/outreach-nurture-db";

const postSchema = z.object({
  enrollTargetId: z.string().uuid().optional(),
  enrollMissing: z.boolean().optional(),
  sendNowTargetId: z.string().uuid().optional()
});

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const sequences = await listNurtureWithTargets();
  const res = NextResponse.json({ sequences });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const by = getSessionEmail();

  if (parsed.data.sendNowTargetId) {
    const nurture = await getOutreachNurtureByTargetId(parsed.data.sendNowTargetId);
    if (!nurture) {
      return NextResponse.json({ error: "No sequence for this target." }, { status: 404 });
    }
    const result = await sendNextNurtureEmail(nurture, { createdByEmail: by });
    const sequences = await listNurtureWithTargets();
    return NextResponse.json({ ok: result.ok, reason: result.reason, sequences });
  }

  if (parsed.data.enrollTargetId) {
    const result = await enrollOne(parsed.data.enrollTargetId, by);
    const sequences = await listNurtureWithTargets();
    return NextResponse.json({ ...result, sequences });
  }

  if (parsed.data.enrollMissing) {
    const sequencesBefore = await listNurtureWithTargets();
    const enrolledIds = new Set(sequencesBefore.map((s) => s.targetId));
    const leads = await listEventLeads({ limit: 300 });
    let enrolled = 0;
    let skipped = 0;
    for (const lead of leads) {
      if (!lead.outreachTargetId || enrolledIds.has(lead.outreachTargetId)) {
        skipped += 1;
        continue;
      }
      const result = await enrollOutreachNurture({
        targetId: lead.outreachTargetId,
        payload: lead.payload,
        interest: lead.interest,
        createdByEmail: by
      });
      if (result.ok) {
        enrolled += 1;
        enrolledIds.add(lead.outreachTargetId);
      } else skipped += 1;
    }
    const sequences = await listNurtureWithTargets();
    return NextResponse.json({ ok: true, enrolled, skipped, sequences });
  }

  return NextResponse.json({ error: "Nothing to do." }, { status: 400 });
}

async function enrollOne(targetId: string, createdByEmail: string | null) {
  const target = await getOutreachTarget(targetId);
  if (!target) return { ok: false as const, reason: "target_not_found" };
  const leads = await listEventLeads({ limit: 300 });
  const lead = leads.find((row) => row.outreachTargetId === targetId) || null;
  return enrollOutreachNurture({
    targetId,
    payload: lead?.payload,
    interest: lead?.interest || target.interest,
    createdByEmail
  });
}
