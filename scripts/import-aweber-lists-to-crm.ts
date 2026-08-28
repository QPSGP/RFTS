/**
 * Import AWeber list-folder CSVs into the outreach CRM and create
 * awaiting-approval campaigns (not sent).
 *
 *   npx tsx scripts/import-aweber-lists-to-crm.ts
 *   npx tsx scripts/import-aweber-lists-to-crm.ts --dry-run
 */
import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local") });

const LISTS_DIR = path.join(process.cwd(), "docs", "20260822-aweber-lists-for-rfts");
const DRY_RUN = process.argv.includes("--dry-run");

function clip(text: string, max = 1900): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function main() {
  if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
    console.error("POSTGRES_URL missing in .env.local");
    process.exit(1);
  }

  const {
    buildAweberContactNotes,
    campaignNameForList,
    chunkIds,
    mergeAweberLeads,
    metaFromAweberFolder,
    parseAweberLeadsCsv
  } = await import("../src/lib/aweber-list-import");
  const { CAMPAIGN_MAX_RECIPIENTS, resolveCampaignTemplate } = await import(
    "../src/lib/outreach-campaigns"
  );
  const { TERRY_FACILITATOR_REF_CODE } = await import("../src/lib/event-leads");
  const { mergeOutreachNotes, outreachPipelineStatusFromImport } = await import(
    "../src/lib/marketing-import"
  );
  const {
    createOutreachContact,
    createOutreachTarget,
    listAllOutreachContacts,
    listOutreachEmailTemplates,
    listOutreachTargets,
    seedOutreachEmailTemplates,
    updateOutreachContact,
    updateOutreachTarget
  } = await import("../src/lib/db");
  const { listOutreachCampaigns, createOutreachCampaign, createOutreachCampaignRecipient } =
    await import("../src/lib/outreach-campaigns-db");
  const { mergeOutreachTemplate } = await import("../src/lib/marketing-reference");
  const { getBaseUrl } = await import("../src/lib/email");

  const folders = (await fs.readdir(LISTS_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && d.name.startsWith("awlist"))
    .map((d) => d.name)
    .sort();

  const parsedLists: Array<{
    meta: ReturnType<typeof metaFromAweberFolder>;
    leads: ReturnType<typeof parseAweberLeadsCsv>;
  }> = [];

  console.log(`Reading ${folders.length} AWeber list folders from ${LISTS_DIR}`);
  for (const folder of folders) {
    const meta = metaFromAweberFolder(folder);
    const activePath = path.join(LISTS_DIR, folder, "leads", "active_leads.csv");
    const inactivePath = path.join(LISTS_DIR, folder, "leads", "inactive_leads.csv");
    const leads: ReturnType<typeof parseAweberLeadsCsv> = [];
    for (const file of [activePath, inactivePath]) {
      try {
        const text = await fs.readFile(file, "utf8");
        leads.push(...parseAweberLeadsCsv(text));
      } catch {
        // Missing file is fine.
      }
    }
    const active = leads.filter((l) => l.active).length;
    console.log(
      `  ${meta.title}: ${leads.length} parsed (${active} active) → ${meta.templateName}`
    );
    parsedLists.push({ meta, leads });
  }

  const merged = mergeAweberLeads(parsedLists);
  const campaignEligible = parsedLists.map(({ meta, leads }) => {
    const emails = [
      ...new Set(leads.filter((l) => l.active).map((l) => l.email))
    ].filter((email) => {
      const row = merged.find((m) => m.email === email);
      return !!row && row.activeListTags.includes(meta.tag) && !row.doNotEmail;
    });
    return { meta, emails };
  });

  console.log(
    `\nUnique emails: ${merged.length}. Do-not-email: ${
      merged.filter((m) => m.doNotEmail).length
    }.`
  );
  if (DRY_RUN) {
    for (const row of campaignEligible) {
      const parts = Math.max(1, Math.ceil(row.emails.length / CAMPAIGN_MAX_RECIPIENTS));
      console.log(
        `  Campaign ${campaignNameForList(row.meta, 1, parts)}: ${row.emails.length} recipients`
      );
    }
    console.log("Dry run only. Re-run without --dry-run to import.");
    return;
  }

  const templatesAdded = await seedOutreachEmailTemplates();
  console.log(`Email templates: added ${templatesAdded} starter(s).`);

  const existingTargets = await listOutreachTargets();
  const existingContacts = await listAllOutreachContacts();
  const targetById = new Map(existingTargets.map((t) => [t.id, t]));
  const emailToContact = new Map<string, (typeof existingContacts)[number]>();
  const emailToTargetId = new Map<string, string>();
  for (const contact of existingContacts) {
    const email = contact.email?.trim().toLowerCase();
    if (!email || !targetById.has(contact.targetId)) continue;
    if (!emailToContact.has(email)) emailToContact.set(email, contact);
    if (!emailToTargetId.has(email)) emailToTargetId.set(email, contact.targetId);
  }
  const existingNames = new Set(
    existingTargets.map((t) => t.organization.trim().toLowerCase())
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < merged.length; i++) {
    const row = merged[i];
    const notes = clip(
      buildAweberContactNotes({
        person: row.person,
        listTags: [...row.activeListTags, ...row.unsubscribedTitles.map((t) => `unsub-${t}`)],
        listTitles: row.allListTitles,
        unsubscribedLists: row.unsubscribedTitles
      })
    );
    const displayName =
      row.person.fullName ||
      [row.person.firstName, row.person.lastName].filter(Boolean).join(" ") ||
      row.email;
    const matchedId = emailToTargetId.get(row.email);
    try {
      if (matchedId) {
        const target = targetById.get(matchedId);
        const contact = emailToContact.get(row.email);
        if (!target) {
          failed += 1;
          continue;
        }
        const nextNotes = mergeOutreachNotes(target.notes, notes);
        const nextDoNotEmail = target.doNotEmail || row.doNotEmail;
        const contactNotes = contact ? mergeOutreachNotes(contact.notes, notes) : notes;
        const changed =
          nextNotes !== (target.notes || null) ||
          nextDoNotEmail !== target.doNotEmail ||
          (contact != null && contactNotes !== (contact.notes || null));
        if (!changed) {
          skipped += 1;
        } else {
          const saved = await updateOutreachTarget(target.id, {
            organization: target.organization,
            notes: nextNotes,
            doNotEmail: nextDoNotEmail,
            interest: target.interest || row.primaryMeta.interest,
            category: target.category || row.primaryMeta.category,
            entryPath: target.entryPath || row.primaryMeta.entryPath
          });
          if (saved) targetById.set(saved.id, saved);
          if (contact && contactNotes !== (contact.notes || null)) {
            const savedContact = await updateOutreachContact(contact.id, { notes: contactNotes });
            if (savedContact) emailToContact.set(row.email, savedContact);
          }
          updated += 1;
        }
      } else {
        let organization = displayName;
        const nameKey = organization.trim().toLowerCase();
        if (existingNames.has(nameKey)) organization = `${organization} · ${row.email}`;
        const target = await createOutreachTarget({
          organization,
          targetType: "individual",
          category: row.primaryMeta.category,
          entryPath: row.primaryMeta.entryPath,
          contact: row.email,
          refCode: TERRY_FACILITATOR_REF_CODE,
          status: outreachPipelineStatusFromImport(row.person.status),
          notes,
          interest: row.primaryMeta.interest,
          doNotEmail: row.doNotEmail
        });
        existingNames.add(target.organization.trim().toLowerCase());
        targetById.set(target.id, target);
        emailToTargetId.set(row.email, target.id);
        const createdContact = await createOutreachContact({
          targetId: target.id,
          firstName: row.person.firstName,
          lastName: row.person.lastName,
          name: displayName,
          email: row.email,
          notes,
          isPrimary: true
        });
        emailToContact.set(row.email, createdContact);
        created += 1;
      }
    } catch (err) {
      failed += 1;
      console.warn(`Failed ${row.email}:`, err instanceof Error ? err.message : err);
    }
    if ((i + 1) % 250 === 0) {
      console.log(`  CRM progress ${i + 1}/${merged.length} (created ${created}, updated ${updated})`);
    }
  }

  console.log(
    `\nCRM: created ${created}, updated ${updated}, unchanged ${skipped}, failed ${failed}.`
  );

  const existingCampaigns = await listOutreachCampaigns();
  const existingNamesSet = new Set(existingCampaigns.map((c) => c.name));
  const dbTemplates = await listOutreachEmailTemplates();
  const siteUrl = getBaseUrl() || "https://reachforthestars.today";
  let campaignsCreated = 0;
  let recipientsDrafted = 0;
  let campaignsSkipped = 0;

  for (const row of campaignEligible) {
    const contacts = row.emails
      .map((email) => emailToContact.get(email))
      .filter((c): c is NonNullable<typeof c> => !!c?.email && !targetById.get(c.targetId)?.doNotEmail);
    if (!contacts.length) continue;
    const template = resolveCampaignTemplate(row.meta.templateName, dbTemplates);
    if (!template) {
      console.warn(`Missing template "${row.meta.templateName}" for ${row.meta.title}`);
      continue;
    }
    const chunks = chunkIds(contacts, CAMPAIGN_MAX_RECIPIENTS);
    for (let part = 0; part < chunks.length; part++) {
      const name = campaignNameForList(row.meta, part + 1, chunks.length);
      if (existingNamesSet.has(name)) {
        campaignsSkipped += 1;
        continue;
      }
      const campaign = await createOutreachCampaign({
        name,
        templateName: template.name,
        templateId: template.id,
        query: { tag: row.meta.tag, doNotEmail: false, hasEmail: true },
        createdByEmail: "aweber-list-import",
        status: "awaiting_approval"
      });
      existingNamesSet.add(campaign.name);
      let drafted = 0;
      for (const contact of chunks[part]) {
        const target = targetById.get(contact.targetId);
        if (!target || !contact.email) continue;
        const vars = {
          name: contact.name || contact.email,
          contactName: contact.name || contact.email,
          firstName: contact.firstName || "",
          lastName: contact.lastName || "",
          organization: target.organization,
          persona: target.persona || "",
          siteUrl,
          yourName: "Reach For The Stars",
          refCode: target.refCode || TERRY_FACILITATOR_REF_CODE
        };
        await createOutreachCampaignRecipient({
          campaignId: campaign.id,
          targetId: target.id,
          contactId: contact.id,
          email: contact.email,
          subject: mergeOutreachTemplate(template.subject, vars),
          bodyText: mergeOutreachTemplate(template.bodyText, vars),
          status: "draft"
        });
        drafted += 1;
      }
      campaignsCreated += 1;
      recipientsDrafted += drafted;
      console.log(`  ${name}: drafted ${drafted} awaiting approval`);
    }
  }

  console.log(
    `\nCampaigns created: ${campaignsCreated} (${recipientsDrafted} drafts). Already present: ${campaignsSkipped}.`
  );
  console.log("Nothing was sent. Approve in Admin → Email campaigns.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
