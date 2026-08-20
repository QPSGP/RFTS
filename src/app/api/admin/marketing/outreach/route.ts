import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import {
  createOutreachActivity,
  createOutreachContact,
  createOutreachTarget,
  deleteOutreachTarget,
  getOutreachTarget,
  listOutreachTargets,
  updateOutreachTarget
} from "@/lib/db";
import { TERRY_FACILITATOR_REF_CODE } from "@/lib/event-leads";
import {
  normalizeImportRow,
  parseDelimitedTable
} from "@/lib/marketing-import";
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

const createSchema = z.union([
  z.object({ seed: z.literal(true) }),
  z.object({
    importDatabase: z.literal(true),
    text: z.string().optional(),
    rows: z.array(z.record(z.string(), z.unknown())).optional()
  }),
  targetSchema
]);

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
        refCode: TERRY_FACILITATOR_REF_CODE,
        status: "prospect"
      });
      added += 1;
    }
    const targets = await listOutreachTargets();
    return NextResponse.json({ ok: true, added, targets });
  }

  if ("importDatabase" in parsed.data) {
    let batch: Record<string, string>[] = [];
    if (typeof parsed.data.text === "string" && parsed.data.text.trim()) {
      batch = parseDelimitedTable(parsed.data.text);
    } else if (Array.isArray(parsed.data.rows)) {
      batch = parsed.data.rows.map((raw) => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) {
          if (v == null) continue;
          out[k] = typeof v === "string" ? v : String(v);
        }
        return out;
      });
    }
    if (batch.length > 500) {
      return NextResponse.json(
        { error: "Import batch too large (max 500)." },
        { status: 400 }
      );
    }
    if (!batch.length) {
      return NextResponse.json(
        {
          error:
            "No rows to import. Upload CSV/TSV or JSON with name/email/organization columns."
        },
        { status: 400 }
      );
    }

    const existing = await listOutreachTargets();
    const existingNames = new Set(existing.map((t) => t.organization.trim().toLowerCase()));
    const results: { organization?: string; id?: string; skipped?: boolean; error?: string }[] =
      [];
    const by = getSessionEmail();

    for (const row of batch) {
      const n = normalizeImportRow(row);
      const organization =
        n.organization ||
        n.fullName ||
        [n.firstName, n.lastName].filter(Boolean).join(" ") ||
        n.email;
      if (!organization) {
        results.push({ error: "missing_name" });
        continue;
      }
      const key = organization.trim().toLowerCase();
      if (existingNames.has(key)) {
        results.push({ organization, skipped: true });
        continue;
      }
      const targetType: "organization" | "individual" =
        n.targetType === "organization"
          ? "organization"
          : n.targetType === "individual"
            ? "individual"
            : n.organization && n.fullName && n.organization !== n.fullName
              ? "organization"
              : n.organization && !n.fullName && !n.firstName
                ? "organization"
                : "individual";
      try {
        const target = await createOutreachTarget({
          organization,
          targetType,
          category: n.category,
          persona: n.persona,
          entryPath: n.entryPath || "Facilitator / Managed",
          contact: [n.email, n.phoneMobile].filter(Boolean).join(" · ") || null,
          refCode: n.refCode || TERRY_FACILITATOR_REF_CODE,
          status: n.status || "prospect",
          notes: n.notes,
          interest: n.interest,
          doNotEmail: false
        });
        existingNames.add(key);
        if (n.email || n.fullName || n.firstName || n.phoneMobile) {
          await createOutreachContact({
            targetId: target.id,
            firstName: n.firstName,
            lastName: n.lastName,
            name: n.fullName,
            email: n.email,
            phoneMobile: n.phoneMobile,
            notes: n.notes,
            isPrimary: true
          });
        }
        await createOutreachActivity({
          targetId: target.id,
          kind: "imported",
          subject: "Imported from database",
          bodyPreview: organization,
          createdByEmail: by
        });
        try {
          const { enrollOutreachNurture } = await import("@/lib/outreach-nurture");
          await enrollOutreachNurture({
            targetId: target.id,
            interest: n.interest,
            interests: n.goals,
            createdByEmail: by
          });
        } catch {
          // Sequence enroll is best-effort.
        }
        results.push({ organization, id: target.id, skipped: false });
      } catch {
        results.push({ organization, error: "create_failed" });
      }
    }

    const targets = await listOutreachTargets();
    return NextResponse.json({
      ok: true,
      imported: results.filter((r) => r.id && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      errors: results.filter((r) => r.error).length,
      results,
      targets
    });
  }

  const data = parsed.data as z.infer<typeof targetSchema>;
  const target = await createOutreachTarget({
    ...data,
    refCode: data.refCode?.trim() || TERRY_FACILITATOR_REF_CODE
  });
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
