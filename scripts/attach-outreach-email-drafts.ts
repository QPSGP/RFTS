/**
 * Attach ready-to-send email drafts on due outreach targets (activity notes).
 * Does not send email. Add real contact emails in Admin CRM, then Send.
 *
 *   npx tsx scripts/attach-outreach-email-drafts.ts
 */
import path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const {
    createOutreachActivity,
    listOutreachContacts,
    listOutreachEmailTemplates,
    listOutreachTargets
  } = await import("../src/lib/db");
  const { mergeOutreachTemplate } = await import("../src/lib/marketing-reference");
  const { getBaseUrl } = await import("../src/lib/email");

  const siteUrl = getBaseUrl() || "https://reachforthestars.today";
  const templates = await listOutreachEmailTemplates();
  const byPurpose = (purpose: string) =>
    templates.find((t) => t.purpose === purpose) ||
    templates.find((t) => t.name.toLowerCase().includes(purpose.replace(/_/g, " ")));

  const map: { match: RegExp; purpose: string }[] = [
    { match: /metro fire/i, purpose: "affiliate_resilience_partner" },
    { match: /apex sales/i, purpose: "affiliate_sales_edge" },
    { match: /harbor group/i, purpose: "affiliate_resilience_partner" },
    { match: /riley chen/i, purpose: "resilience_blog_share" },
    { match: /morgan okonkwo/i, purpose: "affiliate_sales_edge" },
    { match: /taylor nguyen/i, purpose: "resilience_blog_share" },
    { match: /casey brooks/i, purpose: "resilience_blog_share" }
  ];

  const targets = await listOutreachTargets();
  let attached = 0;

  for (const target of targets) {
    const rule = map.find((m) => m.match.test(target.organization));
    if (!rule) continue;
    const template = byPurpose(rule.purpose);
    if (!template) {
      console.warn(`No template for ${rule.purpose} — skip ${target.organization}`);
      continue;
    }
    const contacts = await listOutreachContacts(target.id);
    const primary = contacts.find((c) => c.isPrimary) || contacts[0];
    const vars = {
      name: primary?.name || target.organization,
      contactName: primary?.name || target.organization,
      firstName: primary?.firstName || primary?.name?.split(/\s+/)[0] || "there",
      lastName: primary?.lastName || "",
      organization: target.organization,
      persona: target.persona || "",
      siteUrl,
      yourName: "Reach For The Stars",
      refCode: target.refCode || "6051C794"
    };
    const subject = mergeOutreachTemplate(template.subject, vars);
    const body = mergeOutreachTemplate(template.bodyText, vars);
    await createOutreachActivity({
      targetId: target.id,
      contactId: primary?.id ?? null,
      kind: "draft_email",
      subject: `Draft ready: ${template.name}`,
      bodyPreview: `SUBJECT:\n${subject}\n\nBODY:\n${body}\n\n---\nNext: add real email on contact → CRM → Send email → paste or pick template "${template.name}".`,
      meta: { templateId: template.id, purpose: rule.purpose },
      createdByEmail: "attach-outreach-email-drafts"
    });
    attached += 1;
    console.log(`Draft on ${target.organization} ← ${template.name}`);
  }

  console.log(`Attached ${attached} draft(s). Open Admin → Outreach → Due this week → CRM → Activity.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
