/**
 * Set richard@visimon.app on a CRM test contact and optionally send via production Resend
 * is not available locally (no RESEND_API_KEY). Prefer Admin CRM → Send on production.
 *
 * Updates "Riley Chen" primary contact email for end-to-end CRM send testing.
 *
 *   npx tsx scripts/set-crm-test-email.ts
 */
import path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local") });

const TEST_EMAIL = "richard@visimon.app";

async function main() {
  const {
    createOutreachActivity,
    listOutreachContacts,
    listOutreachTargets,
    updateOutreachContact
  } = await import("../src/lib/db");

  const targets = await listOutreachTargets();
  const target =
    targets.find((t) => /riley chen/i.test(t.organization)) ||
    targets.find((t) => t.targetType === "individual");
  if (!target) {
    console.error("No CRM target found. Run: npx tsx scripts/seed-outreach-crm-week.ts");
    process.exit(1);
  }
  const contacts = await listOutreachContacts(target.id);
  const primary = contacts.find((c) => c.isPrimary) || contacts[0];
  if (!primary) {
    console.error(`No contact on ${target.organization}`);
    process.exit(1);
  }

  const updated = await updateOutreachContact(primary.id, {
    email: TEST_EMAIL,
    firstName: primary.firstName || "Richard",
    lastName: primary.lastName || "Weatherman"
  });
  await createOutreachActivity({
    targetId: target.id,
    contactId: primary.id,
    kind: "note",
    subject: "Test email set for CRM send",
    bodyPreview: `Contact email set to ${TEST_EMAIL}. Open CRM → Send email → Resilience blog share → Send via Resend (production has RESEND_API_KEY).`,
    createdByEmail: "set-crm-test-email"
  });

  console.log(`Updated ${target.organization} / ${updated?.name} → ${TEST_EMAIL}`);
  console.log("Next: Admin → Marketing → Outreach → Due this week → CRM on that row → Send email.");
  if (!process.env.RESEND_API_KEY) {
    console.log("Local RESEND_API_KEY missing — send from production Admin UI (or add key to .env.local).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
