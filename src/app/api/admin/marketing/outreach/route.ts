import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import {
  createOutreachActivity,
  createOutreachTarget,
  deleteOutreachTarget,
  getOutreachTarget,
  listOutreachTargets,
  updateOutreachTarget
} from "@/lib/db";
import { STARTER_OUTREACH_TARGETS } from "@/lib/marketing-reference";

const targetSchema = z.object({
  organization: z.string().trim().min(1).max(200),
  targetType: z.enum(["organization", "individual"]).nullish(),
  category: z.string().trim().max(120).nullish(),
  persona: z.string().trim().max(120).nullish(),
  entryPath: z.string().trim().max(60).nullish(),
  contact: z.string().trim().max(500).nullish(),
  refCode: z.string().trim().max(40).nullish(),
  status: z.string().trim().max(40).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  interest: z.string().trim().max(120).nullish(),
  audienceSize: z.string().trim().max(80).nullish(),
  decisionTimeline: z.string().trim().max(120).nullish(),
  followUpAt: z
    .string()
    .trim()
    .max(40)
    .nullish()
    .transform((v) => {
      if (!v) return null;
      const ms = Date.parse(v);
      return Number.isNaN(ms) ? null : new Date(ms).toISOString();
    }),
  doNotEmail: z.boolean().nullish()
});

const createSchema = z.union([z.object({ seed: z.literal(true) }), targetSchema]);

const updateSchema = targetSchema.extend({
  id: z.string().uuid()
});

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const targets = await listOutreachTargets();
  const res = NextResponse.json({ targets });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  if ("seed" in parsed.data) {
    const existing = await listOutreachTargets();
    const existingNames = new Set(existing.map((t) => t.organization.trim().toLowerCase()));
    let added = 0;
    for (const starter of STARTER_OUTREACH_TARGETS) {
      if (existingNames.has(starter.organization.trim().toLowerCase())) continue;
      await createOutreachTarget({
        organization: starter.organization,
        category: starter.category,
        persona: starter.persona,
        entryPath: starter.entryPath,
        status: "prospect"
      });
      added += 1;
    }
    const targets = await listOutreachTargets();
    return NextResponse.json({ ok: true, added, targets });
  }

  const target = await createOutreachTarget(parsed.data);
  await createOutreachActivity({
    targetId: target.id,
    kind: "created",
    subject: "Target added",
    bodyPreview: target.organization,
    createdByEmail: getSessionEmail()
  });
  return NextResponse.json({ ok: true, target });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { id, ...rest } = parsed.data;
  const before = await getOutreachTarget(id);
  const target = await updateOutreachTarget(id, rest);
  if (!target) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const by = getSessionEmail();
  if (before && before.status !== target.status) {
    await createOutreachActivity({
      targetId: id,
      kind: "status_change",
      subject: `Status → ${target.status}`,
      bodyPreview: `${before.status} → ${target.status}`,
      meta: { from: before.status, to: target.status },
      createdByEmail: by
    });
  }
  return NextResponse.json({ ok: true, target });
}

export async function DELETE(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  let id = url.searchParams.get("id") || "";
  if (!id) {
    const body = await request.json().catch(() => ({}));
    id = typeof body?.id === "string" ? body.id : "";
  }
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }
  const ok = await deleteOutreachTarget(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
