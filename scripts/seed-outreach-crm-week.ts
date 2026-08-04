/**
 * Seed this week's marketing CRM pipeline: persona individuals, partner orgs,
 * contacts, follow-ups, and outreach email templates.
 *
 * Does NOT send live email unless SEED_OUTREACH_SEND_TO is set (defaults to richard@visimon.app).
 *
 * Usage (from rfts-platform):
 *   npx tsx scripts/seed-outreach-crm-week.ts
 *   SEED_OUTREACH_SEND_TO=other@example.com npx tsx scripts/seed-outreach-crm-week.ts
 */
import path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const {
    createOutreachActivity,
    createOutreachContact,
    createOutreachTarget,
    listOutreachEmailTemplates,
    listOutreachTargets,
    seedOutreachEmailTemplates
  } = await import("../src/lib/db");
  const { sendEmail, getBaseUrl } = await import("../src/lib/email");
  const { mergeOutreachTemplate } = await import("../src/lib/marketing-reference");

  if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
    console.error("POSTGRES_URL missing in .env.local");
    process.exit(1);
  }

  const templatesAdded = await seedOutreachEmailTemplates();
  console.log(`Email templates: added ${templatesAdded} starter(s).`);

  const existing = await listOutreachTargets();
  const byName = new Set(existing.map((t) => t.organization.trim().toLowerCase()));

  const followUp = (daysFromNow: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + daysFromNow);
    d.setUTCHours(17, 0, 0, 0);
    return d.toISOString();
  };

  type SeedRow = {
    organization: string;
    targetType: "individual" | "organization";
    category: string;
    persona: string;
    entryPath: string;
    interest: string;
    audienceSize: string;
    decisionTimeline: string;
    followUpDays: number;
    notes: string;
    contact: {
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      phoneMobile: string | null;
      roleTitle: string;
      linkedinUrl: string | null;
      instagramUrl: string | null;
      notes: string;
    };
  };

  const seeds: SeedRow[] = [
    {
      organization: "Riley Chen",
      targetType: "individual",
      category: "Individuals & influencers",
      persona: "Riley — Single Seeking a Match",
      entryPath: "Direct",
      interest: "Personal membership",
      audienceSize: "Newsletter ~4k",
      decisionTimeline: "Trying programs this month",
      followUpDays: 2,
      notes: "Dating Confidence pack prospect. Replace email before Resend send.",
      contact: {
        firstName: "Riley",
        lastName: "Chen",
        email: null,
        phone: null,
        phoneMobile: null,
        roleTitle: "Dating / relationship coach (prospect)",
        linkedinUrl: "https://www.linkedin.com/",
        instagramUrl: "@rileychen.placeholder",
        notes: "Persona pack: Dating Confidence. Add real email + IG, then send resilience or relationship intro."
      }
    },
    {
      organization: "Morgan Okonkwo",
      targetType: "individual",
      category: "Individuals & influencers",
      persona: "Morgan — High-Pressure Sales Professional",
      entryPath: "Affiliate",
      interest: "Affiliate partnership",
      audienceSize: "AE book ~80 accounts",
      decisionTimeline: "End of quarter review",
      followUpDays: 3,
      notes: "Sales Edge pack. Strong for wealth + resilience messaging.",
      contact: {
        firstName: "Morgan",
        lastName: "Okonkwo",
        email: null,
        phone: null,
        phoneMobile: null,
        roleTitle: "Enterprise AE",
        linkedinUrl: "https://www.linkedin.com/",
        instagramUrl: null,
        notes: "Persona pack: Sales Edge. Use affiliate_sales_edge template when email known."
      }
    },
    {
      organization: "Taylor Nguyen",
      targetType: "individual",
      category: "Individuals & influencers",
      persona: "Taylor — Exam-Bound Professional",
      entryPath: "Direct",
      interest: "Personal membership",
      audienceSize: "Study cohort ~25",
      decisionTimeline: "NCLEX window in 6 weeks",
      followUpDays: 4,
      notes: "Exam Calm pack — seasonal urgency.",
      contact: {
        firstName: "Taylor",
        lastName: "Nguyen",
        email: null,
        phone: null,
        phoneMobile: null,
        roleTitle: "RN candidate",
        linkedinUrl: null,
        instagramUrl: null,
        notes: "Exam Calm pack. Offer memory + sleep + stress landings."
      }
    },
    {
      organization: "Casey Brooks",
      targetType: "individual",
      category: "Individuals & influencers",
      persona: "Casey — Working Actor / Performer",
      entryPath: "Direct",
      interest: "Personal membership",
      audienceSize: "Workshop list ~200",
      decisionTimeline: "Audition season ongoing",
      followUpDays: 5,
      notes: "Audition Presence pack.",
      contact: {
        firstName: "Casey",
        lastName: "Brooks",
        email: null,
        phone: null,
        phoneMobile: null,
        roleTitle: "Actor / self-tape coach interest",
        linkedinUrl: null,
        instagramUrl: "@caseybrooks.placeholder",
        notes: "Audition Presence pack. Inspiration + emotional health landings."
      }
    },
    {
      organization: "Metro Fire Peer Support & Wellness Unit",
      targetType: "organization",
      category: "First responders & public safety",
      persona: "Jordan — Front-Line Caregiver",
      entryPath: "Affiliate",
      interest: "Wellness program for staff",
      audienceSize: "~180 sworn + civilian",
      decisionTimeline: "Wellness committee next month",
      followUpDays: 2,
      notes: "Partner outreach — resilience + sleep + 25% affiliate. Week of 2026-08-03.",
      contact: {
        firstName: "Dana",
        lastName: "Ruiz",
        email: null,
        phone: null,
        phoneMobile: null,
        roleTitle: "Peer support coordinator",
        linkedinUrl: null,
        instagramUrl: null,
        notes: "Send affiliate_resilience_partner template when email confirmed."
      }
    },
    {
      organization: "Apex Sales Leadership Coaching",
      targetType: "organization",
      category: "Corporate & high-stress professions",
      persona: "Morgan — High-Pressure Sales Professional",
      entryPath: "Affiliate",
      interest: "Affiliate partnership",
      audienceSize: "Client AEs ~400",
      decisionTimeline: "Q4 curriculum refresh",
      followUpDays: 3,
      notes: "Sales Edge partner — 25% ongoing.",
      contact: {
        firstName: "Chris",
        lastName: "Patel",
        email: null,
        phone: null,
        phoneMobile: null,
        roleTitle: "Founder / sales trainer",
        linkedinUrl: "https://www.linkedin.com/",
        instagramUrl: null,
        notes: "Use affiliate_sales_edge template."
      }
    },
    {
      organization: "Harbor Group Therapy Practice",
      targetType: "organization",
      category: "Mental & behavioral health providers",
      persona: "Alex — Burned-Out Professional",
      entryPath: "Affiliate",
      interest: "Affiliate partnership",
      audienceSize: "12 clinicians",
      decisionTimeline: "Partner review this quarter",
      followUpDays: 4,
      notes: "Therapist affiliate — stress/sleep/resilience for clients.",
      contact: {
        firstName: "Jordan",
        lastName: "Ellis",
        email: null,
        phone: null,
        phoneMobile: null,
        roleTitle: "Practice manager",
        linkedinUrl: null,
        instagramUrl: null,
        notes: "Partner intro + /affiliates + resilience/stress/sleep links."
      }
    }
  ];

  let addedTargets = 0;
  let addedContacts = 0;

  for (const row of seeds) {
    if (byName.has(row.organization.trim().toLowerCase())) {
      console.log(`Skip existing: ${row.organization}`);
      continue;
    }
    const target = await createOutreachTarget({
      organization: row.organization,
      targetType: row.targetType,
      category: row.category,
      persona: row.persona,
      entryPath: row.entryPath,
      status: "prospect",
      notes: row.notes,
      interest: row.interest,
      audienceSize: row.audienceSize,
      decisionTimeline: row.decisionTimeline,
      followUpAt: followUp(row.followUpDays),
      doNotEmail: false
    });
    addedTargets += 1;
    byName.add(row.organization.trim().toLowerCase());

    const contact = await createOutreachContact({
      targetId: target.id,
      firstName: row.contact.firstName,
      lastName: row.contact.lastName,
      email: row.contact.email,
      phone: row.contact.phone,
      phoneMobile: row.contact.phoneMobile,
      roleTitle: row.contact.roleTitle,
      linkedinUrl: row.contact.linkedinUrl,
      instagramUrl: row.contact.instagramUrl,
      notes: row.contact.notes,
      isPrimary: true
    });
    addedContacts += 1;

    await createOutreachActivity({
      targetId: target.id,
      contactId: contact.id,
      kind: "note",
      subject: "Week pipeline seed — ready for real email",
      bodyPreview:
        "CRM card created with follow-up this week. Add a real email on the contact, open CRM → Send email, pick Partner / resilience template, send via Resend.",
      createdByEmail: "seed-outreach-crm-week"
    });

    console.log(`Added: ${row.organization} (${row.targetType}) → contact ${contact.firstName}`);
  }

  const sendTo = (process.env.SEED_OUTREACH_SEND_TO || "richard@visimon.app").trim();
  if (sendTo) {
    const templates = await listOutreachEmailTemplates();
    const template =
      templates.find((t) => t.purpose === "resilience_blog_share") ||
      templates.find((t) => t.name.includes("Resilience blog"));
    if (!template) {
      console.warn("No resilience_blog_share template found; skip send.");
    } else if (!process.env.RESEND_API_KEY) {
      console.error(
        `Would send CRM smoke to ${sendTo}, but RESEND_API_KEY is missing in .env.local.`
      );
      console.error(
        "Add RESEND_API_KEY from Vercel, or send from production Admin → CRM (contact may already be set to richard@visimon.app)."
      );
    } else {
      const siteUrl = getBaseUrl();
      const subject = mergeOutreachTemplate(template.subject, {
        firstName: "Richard",
        contactName: "Richard",
        name: "Richard",
        siteUrl,
        yourName: "Reach For The Stars"
      });
      const bodyText = mergeOutreachTemplate(template.bodyText, {
        firstName: "Richard",
        contactName: "Richard",
        name: "Richard",
        siteUrl,
        yourName: "Reach For The Stars"
      });
      const result = await sendEmail({
        to: sendTo,
        subject: `[CRM test] ${subject}`,
        text: bodyText,
        html: `<pre style="font-family:Georgia,serif;font-size:15px;line-height:1.5;white-space:pre-wrap;">${bodyText
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</pre>`
      });
      if (result.ok) {
        console.log(`Sent CRM smoke email to ${sendTo}`);
      } else {
        console.error(`Send failed: ${result.error}`);
      }
    }
  } else {
    console.log("SEED_OUTREACH_SEND_TO empty — skip send.");
  }

  console.log(`Done. Targets added: ${addedTargets}. Contacts added: ${addedContacts}.`);
  console.log("Admin → Marketing → Outreach → Due this week / CRM to continue.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
