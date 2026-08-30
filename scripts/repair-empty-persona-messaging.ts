/**
 * Complete partner-intro drafts that ended "...sample messaging for ."
 * because {{persona}} was empty (AWeber Clients Grow and similar lists).
 *
 *   npx tsx scripts/repair-empty-persona-messaging.ts
 *   npx tsx scripts/repair-empty-persona-messaging.ts --dry-run
 */
import path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local") });

const DRY_RUN = process.argv.includes("--dry-run");
const TEMPLATES_ONLY = process.argv.includes("--templates-only");

async function main() {
  if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
    console.error("POSTGRES_URL missing in .env.local");
    process.exit(1);
  }

  const { completeEmptyPersonaMessaging, completeFragilePartnerPhrases } = await import(
    "../src/lib/marketing-reference"
  );
  const { listOutreachEmailTemplates, updateOutreachEmailTemplate } = await import("../src/lib/db");
  const {
    listOutreachCampaigns,
    listOutreachCampaignRecipients,
    updateOutreachCampaignRecipient
  } = await import("../src/lib/outreach-campaigns-db");

  const templates = await listOutreachEmailTemplates();
  let templatesUpdated = 0;
  for (const template of templates) {
    const bodyText = completeFragilePartnerPhrases(
      completeEmptyPersonaMessaging(template.bodyText)
    );
    if (bodyText === template.bodyText) continue;
    console.log(`${DRY_RUN ? "[dry-run] " : ""}Template "${template.name}"`);
    if (!DRY_RUN) {
      await updateOutreachEmailTemplate(template.id, {
        name: template.name,
        subject: template.subject,
        bodyText,
        purpose: template.purpose
      });
    }
    templatesUpdated += 1;
  }

  let recipientsUpdated = 0;
  let campaignsTouched = 0;
  if (!TEMPLATES_ONLY) {
    const campaigns = await listOutreachCampaigns();
    for (const campaign of campaigns) {
      if (campaign.status === "cancelled" || campaign.status === "completed") continue;
      const recipients = await listOutreachCampaignRecipients(campaign.id);
      let changedHere = 0;
      for (const row of recipients) {
        if (row.status === "sent" || row.status.startsWith("skipped_")) continue;
        const bodyText = completeEmptyPersonaMessaging(row.bodyText);
        if (bodyText === row.bodyText) continue;
        if (!DRY_RUN) {
          await updateOutreachCampaignRecipient(row.id, { bodyText });
        }
        recipientsUpdated += 1;
        changedHere += 1;
      }
      if (changedHere) {
        campaignsTouched += 1;
        console.log(
          `${DRY_RUN ? "[dry-run] " : ""}${campaign.name}: ${changedHere} draft${
            changedHere === 1 ? "" : "s"
          }`
        );
      }
    }
  }

  console.log(
    `\nTemplates ${DRY_RUN ? "would update" : "updated"}: ${templatesUpdated}. Recipients ${
      DRY_RUN ? "would update" : "updated"
    }: ${recipientsUpdated} across ${campaignsTouched} campaign${campaignsTouched === 1 ? "" : "s"}.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
