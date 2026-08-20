import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import {
  createOutreachActivity,
  createOutreachContact,
  createOutreachTarget,
  deleteOutreachTarget,
  getOutreachTarget,
  listAllOutreachContacts,
  listOutreachTargets,
  updateOutreachContact,
  updateOutreachTarget
} from "@/lib/db";
import { TERRY_FACILITATOR_REF_CODE } from "@/lib/event-leads";
import {
  buildOutreachImportNotes,
  importMarksDoNotEmail,
  mergeOutreachNotes,
  normalizeImportRow,
  outreachPipelineStatusFromImport,
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
    const contacts = await listAllOutreachContacts();
    const targetById = new Map(existing.map((t) => [t.id, t]));
    const existingNames = new Set(existing.map((t) => t.organization.trim().toLowerCase()));
    const emailToTargetId = new Map<string, string>();
    const contactByEmail = new Map<string, (typeof contacts)[number]>();
    for (const contact of contacts) {
      const email = contact.email?.trim().toLowerCase();
      if (!email || !targetById.has(contact.targetId)) continue;
      if (!emailToTargetId.has(email)) emailToTargetId.set(email, contact.targetId);
      if (!contactByEmail.has(email)) contactByEmail.set(email, contact);
    }
    const results: {
      organization?: string;
      id?: string;
      skipped?: boolean;
      updated?: boolean;
      error?: string;
    }[] = [];
    const by = getSessionEmail();
    const seenEmails = new Set<string>();

    for (const row of batch) {
      const n = normalizeImportRow(row);
      let organization =
        n.organization ||
        n.fullName ||
        [n.firstName, n.lastName].filter(Boolean).join(" ") ||
        n.email;
      if (!organization) {
        results.push({ error: "missing_name" });
        continue;
      }
      const emailKey = n.email?.trim().toLowerCase() || "";
      if (emailKey && seenEmails.has(emailKey)) {
        results.push({ organization, skipped: true });
        continue;
      }
      if (emailKey) seenEmails.add(emailKey);

      const matchedId = emailKey ? emailToTargetId.get(emailKey) : undefined;
      const matchedByName = !matchedId && !emailKey ? existingNames.has(organization.trim().toLowerCase()) : false;
      const importNotes = buildOutreachImportNotes(n);
      const doNotEmail = importMarksDoNotEmail(n.status);

      if (matchedId) {
        const target = targetById.get(matchedId);
        if (!target) {
          results.push({ organization, error: "match_failed" });
          continue;
        }
        const notes = mergeOutreachNotes(target.notes, importNotes);
        const nextDoNotEmail = target.doNotEmail || doNotEmail;
        const contact = emailKey ? contactByEmail.get(emailKey) : undefined;
        const contactNotes = contact
          ? mergeOutreachNotes(contact.notes, importNotes)
          : importNotes;
        const changed =
          notes !== (target.notes || null) ||
          nextDoNotEmail !== target.doNotEmail ||
          (contact != null && contactNotes !== (contact.notes || null));
        if (!changed) {
          results.push({ organization, id: target.id, skipped: true });
          continue;
        }
        try {
          const updated = await updateOutreachTarget(target.id, {
            organization: target.organization,
            notes,
            doNotEmail: nextDoNotEmail
          });
          if (updated) targetById.set(updated.id, updated);
          if (contact && contactNotes !== (contact.notes || null)) {
            const saved = await updateOutreachContact(contact.id, { notes: contactNotes });
            if (saved && emailKey) contactByEmail.set(emailKey, saved);
          }
          await createOutreachActivity({
            targetId: target.id,
            kind: "imported",
            subject: "Matched existing email",
            bodyPreview: organization,
            createdByEmail: by
          });
          results.push({ organization, id: target.id, updated: true });
        } catch {
          results.push({ organization, error: "update_failed" });
        }
        continue;
      }

      if (matchedByName) {
        results.push({ organization, skipped: true });
        continue;
      }

      const nameKey = organization.trim().toLowerCase();
      if (existingNames.has(nameKey) && emailKey) {
        organization = `${organization} · ${n.email}`;
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
          status: outreachPipelineStatusFromImport(n.status),
          notes: importNotes,
          interest: n.interest,
          doNotEmail
        });
        existingNames.add(target.organization.trim().toLowerCase());
        targetById.set(target.id, target);
        if (emailKey) emailToTargetId.set(emailKey, target.id);
        if (n.email || n.fullName || n.firstName || n.phoneMobile) {
          const createdContact = await createOutreachContact({
            targetId: target.id,
            firstName: n.firstName,
            lastName: n.lastName,
            name: n.fullName,
            email: n.email,
            phoneMobile: n.phoneMobile,
            notes: importNotes,
            isPrimary: true
          });
          if (emailKey) contactByEmail.set(emailKey, createdContact);
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
      imported: results.filter((r) => r.id && !r.skipped && !r.updated).length,
      updated: results.filter((r) => r.updated).length,
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
