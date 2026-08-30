/**
 * Send one sample of each outreach / marketing email type to richard@visimon.app.
 * Does not send to live AWeber campaign lists.
 *
 *   npx tsx scripts/send-outreach-type-samples.ts
 */
import path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env.vercel.production") });

const TO = (process.env.SAMPLE_EMAIL_TO || "richard@visimon.app").trim();
const FROM = "Reach For The Stars <noreply@reachforthestars.today>";
const DELAY_MS = 450;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainHtml(bodyText: string): string {
  return `<pre style="font-family:Georgia,serif;font-size:15px;line-height:1.5;white-space:pre-wrap;">${escapeHtml(
    bodyText
  )}</pre>`;
}

async function main() {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY missing in .env.local");
    process.exit(1);
  }

  const { sendEmail, getBaseUrl } = await import("../src/lib/email");
  const { mergeOutreachTemplate, STARTER_OUTREACH_EMAIL_TEMPLATES } = await import(
    "../src/lib/marketing-reference"
  );
  const { getLeadCardInterestEmail, MEMBER_CONVERT_LEAD_CARD_MENU_EMAIL } = await import(
    "../src/lib/lead-card-interest-emails"
  );
  const { MEMBER_CONVERT_ALL_INTERESTS_EMAIL } = await import(
    "../src/lib/member-conversion-emails"
  );
  const {
    getWelcomeEmailContent,
    getSubscriptionActiveEmailContent,
    getLgdInterestEmailContent,
    getTherapistHealerCoachEmailContent,
    getEventLeadPracticeAutoReplyContent,
    getEventLeadConsumerAutoReplyContent
  } = await import("../src/lib/email-templates");
  const { listAllOutreachContacts, createOutreachTarget, createOutreachContact } =
    await import("../src/lib/db");
  const {
    createOutreachCampaign,
    createOutreachCampaignRecipient,
    updateOutreachCampaign
  } = await import("../src/lib/outreach-campaigns-db");
  const { findOutreachCopyProblems, formatOutreachCopyBlockReason } = await import(
    "../src/lib/outreach-copy-check"
  );

  const siteUrl = getBaseUrl() || "https://reachforthestars.today";
  const vars = {
    name: "Richard Weatherman",
    contactName: "Richard Weatherman",
    firstName: "Richard",
    lastName: "Weatherman",
    organization: "Visimon",
    persona: "Chris - Spiritual Entrepreneur",
    siteUrl,
    yourName: "Reach For The Stars",
    refCode: "6051C794"
  };

  const outreachPurposes = [
    "partner_intro",
    "facilitator_intro",
    "affiliate_resilience_partner",
    "affiliate_sales_edge",
    "resilience_blog_share",
    "new_member",
    "convert_nurture_1",
    "convert_nurture_2",
    "convert_nurture_3",
    "convert_nurture_4",
    "convert_nurture_5"
  ];

  const extraOutreach = [
    MEMBER_CONVERT_ALL_INTERESTS_EMAIL,
    MEMBER_CONVERT_LEAD_CARD_MENU_EMAIL,
    getLeadCardInterestEmail("Stress Management")
  ].filter(Boolean);

  type Job = { label: string; subject: string; text: string; html: string };
  const jobs: Job[] = [];

  for (const purpose of outreachPurposes) {
    const template = STARTER_OUTREACH_EMAIL_TEMPLATES.find((t) => t.purpose === purpose);
    if (!template) {
      console.warn(`Missing starter purpose ${purpose}`);
      continue;
    }
    const subject = mergeOutreachTemplate(template.subject, vars);
    const text = mergeOutreachTemplate(template.bodyText, vars);
    jobs.push({
      label: template.name,
      subject,
      text,
      html: plainHtml(text)
    });
  }

  for (const template of extraOutreach) {
    if (!template) continue;
    const subject = mergeOutreachTemplate(template.subject, vars);
    const text = mergeOutreachTemplate(template.bodyText, vars);
    jobs.push({
      label: template.name,
      subject,
      text,
      html: plainHtml(text)
    });
  }

  const htmlSamples = [
    { label: "HTML welcome", content: getWelcomeEmailContent("Richard", "Weatherman") },
    {
      label: "HTML subscription active",
      content: getSubscriptionActiveEmailContent("Richard", "Gold")
    },
    { label: "HTML LGD interest", content: getLgdInterestEmailContent("Richard") },
    {
      label: "HTML therapist / healer / coach",
      content: getTherapistHealerCoachEmailContent("Richard")
    },
    {
      label: "HTML expo practice auto-reply",
      content: getEventLeadPracticeAutoReplyContent({
        firstName: "Richard",
        eventName: "Small Business Expo"
      })
    },
    {
      label: "HTML consumer abundance auto-reply",
      content: getEventLeadConsumerAutoReplyContent({
        firstName: "Richard",
        eventName: "Small Business Expo"
      })
    }
  ];
  for (const sample of htmlSamples) {
    jobs.push({
      label: sample.label,
      subject: sample.content.subject,
      text: sample.content.text,
      html: sample.content.html
    });
  }

  console.log(`Sending ${jobs.length} samples to ${TO} from ${FROM} (no staff BCC, no live lists).\n`);

  let ok = 0;
  let failed = 0;
  for (const job of jobs) {
    const problems = findOutreachCopyProblems(job.subject, job.text);
    if (problems.length) {
      console.error(`HOLD ${job.label}: ${formatOutreachCopyBlockReason(problems)}`);
      failed += 1;
      continue;
    }
    const result = await sendEmail({
      to: TO,
      from: FROM,
      subject: `[SAMPLE] ${job.subject}`,
      text: job.text,
      html: job.html,
      skipStaffBcc: true
    });
    if (result.ok) {
      ok += 1;
      console.log(`OK  ${job.label}`);
    } else {
      failed += 1;
      console.error(`FAIL ${job.label}: ${result.error}`);
    }
    await sleep(DELAY_MS);
  }

  const contacts = await listAllOutreachContacts();
  let contact = contacts.find((c) => c.email?.trim().toLowerCase() === TO);
  if (!contact) {
    const target = await createOutreachTarget({
      organization: "Richard Weatherman (sample send)",
      targetType: "individual",
      category: "Coaches, studios & practitioners",
      persona: "Chris - Spiritual Entrepreneur",
      entryPath: "Affiliate",
      contact: TO,
      status: "contacted",
      notes: "Test recipient for sample campaign sends. Do not use on live AWeber lists.",
      interest: "Affiliate partnership",
      doNotEmail: false
    });
    contact = await createOutreachContact({
      targetId: target.id,
      firstName: "Richard",
      lastName: "Weatherman",
      name: "Richard Weatherman",
      email: TO,
      isPrimary: true
    });
    console.log(`Created CRM contact for ${TO}`);
  }

  const partner = STARTER_OUTREACH_EMAIL_TEMPLATES.find((t) => t.purpose === "partner_intro");
  if (ok > 0 && partner && contact) {
    const stamp = new Date().toISOString().slice(0, 10);
    const subject = mergeOutreachTemplate(partner.subject, vars);
    const bodyText = mergeOutreachTemplate(partner.bodyText, vars);
    const campaign = await createOutreachCampaign({
      name: `Test · Richard samples · Partner intro · ${stamp}`,
      templateName: partner.name,
      query: { tag: "sample-richard-visimon" },
      createdByEmail: TO,
      status: "completed"
    });
    await createOutreachCampaignRecipient({
      campaignId: campaign.id,
      targetId: contact.targetId,
      contactId: contact.id,
      email: TO,
      subject: `[SAMPLE] ${subject}`,
      bodyText,
      status: "sent"
    });
    await updateOutreachCampaign(campaign.id, { status: "completed" });
    console.log(`\nCampaign in Admin: ${campaign.name}`);
  }

  console.log(`\nDone. Sent ${ok}, failed ${failed}. Check ${TO}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
