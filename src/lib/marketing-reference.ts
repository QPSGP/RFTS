import { HOMEPAGE_GOAL_CARDS } from "@/lib/homepage-goals";
import { WELLNESS_BENEFIT_LINKS } from "@/lib/meditation-benefits";

/** Status options for the outreach tracker (value + label). */
export const OUTREACH_STATUSES = [
  { id: "prospect", label: "Prospect" },
  { id: "contacted", label: "Contacted" },
  { id: "in_talks", label: "In talks" },
  { id: "active", label: "Active partner" },
  { id: "declined", label: "Declined / paused" }
] as const;

/** Organization vs individual prospect in the outreach CRM. */
export const OUTREACH_TARGET_TYPES = [
  { id: "organization", label: "Organization" },
  { id: "individual", label: "Individual" }
] as const;

export type OutreachTargetTypeId = (typeof OUTREACH_TARGET_TYPES)[number]["id"];

export const outreachTargetTypeLabel = (id: string): string =>
  OUTREACH_TARGET_TYPES.find((t) => t.id === id)?.label ?? id;

export type OutreachStatusId = (typeof OUTREACH_STATUSES)[number]["id"];

export const outreachStatusLabel = (id: string): string =>
  OUTREACH_STATUSES.find((s) => s.id === id)?.label ?? id;

/** How a target is expected to convert to members. */
export const OUTREACH_ENTRY_PATHS = [
  "Direct",
  "Affiliate",
  "Facilitator / Managed"
] as const;

/** What the prospect is interested in (CRM gather-info). */
export const OUTREACH_INTERESTS = [
  "Affiliate partnership",
  "Personal membership",
  "Speaker / seminar",
  "Wellness program for staff",
  "Facilitator / managed memberships",
  "Other"
] as const;

export type OutreachTemplateVars = {
  name?: string;
  contactName?: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  persona?: string;
  siteUrl?: string;
  yourName?: string;
  refCode?: string;
};

/** Replace {{placeholders}} in outreach email templates. Unknown keys become empty. */
export function mergeOutreachTemplate(
  text: string,
  vars: OutreachTemplateVars
): string {
  const fullName =
    vars.name ||
    vars.contactName ||
    [vars.firstName, vars.lastName].filter(Boolean).join(" ") ||
    "";
  const map: Record<string, string> = {
    name: fullName,
    contactName: vars.contactName || fullName,
    firstName: vars.firstName || fullName.split(/\s+/)[0] || "",
    lastName: vars.lastName || "",
    organization: vars.organization ?? "",
    persona: vars.persona ?? "",
    siteUrl: vars.siteUrl ?? "",
    yourName: vars.yourName ?? "",
    refCode: vars.refCode ?? ""
  };
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => map[key] ?? "");
}

/** Personas from docs/personas.md, used to tag outreach targets. */
export const OUTREACH_PERSONAS = [
  "Alex — Burned-Out Professional",
  "Jordan — Front-Line Caregiver",
  "Sam — Sleep-Deprived Parent / Caregiver",
  "Chris — Spiritual Entrepreneur",
  "Riley — Single Seeking a Match",
  "Morgan — High-Pressure Sales Professional",
  "Taylor — Exam-Bound Professional",
  "Casey — Working Actor / Performer"
] as const;

/** Segment categories from docs/target-organizations.md. */
export const OUTREACH_CATEGORIES = [
  "Individuals & influencers",
  "First responders & public safety",
  "Healthcare & front-line medical",
  "Mental & behavioral health providers",
  "Corporate & high-stress professions",
  "Veterans & military",
  "Parents & caregivers",
  "Education",
  "Recovery & support communities",
  "Faith & community organizations",
  "Seniors & aging",
  "Coaches, studios & practitioners"
] as const;

export type MarketingLandingLink = {
  group: "Goal" | "Wellness" | "Core";
  label: string;
  path: string;
};

/** Core marketing/site pages worth sharing with a ref link. */
const CORE_MARKETING_PAGES: MarketingLandingLink[] = [
  { group: "Core", label: "Home", path: "/" },
  { group: "Core", label: "How it works", path: "/how-it-works" },
  { group: "Core", label: "The science", path: "/science" },
  { group: "Core", label: "FAQs", path: "/faqs" },
  { group: "Core", label: "Affiliates", path: "/affiliates" }
];

/** All shareable landing pages (goals + wellness + core), de-duplicated by path. */
export const MARKETING_LANDING_LINKS: MarketingLandingLink[] = (() => {
  const goals: MarketingLandingLink[] = HOMEPAGE_GOAL_CARDS.map((card) => ({
    group: "Goal" as const,
    label: card.label,
    path: card.path
  }));
  const seen = new Set<string>();
  const wellness: MarketingLandingLink[] = [];
  for (const benefit of WELLNESS_BENEFIT_LINKS) {
    if (seen.has(benefit.path)) continue;
    seen.add(benefit.path);
    wellness.push({ group: "Wellness", label: benefit.label, path: benefit.path });
  }
  return [...CORE_MARKETING_PAGES, ...goals, ...wellness];
})();

type StarterTarget = {
  organization: string;
  category: string;
  persona: string;
  entryPath: string;
};

const JORDAN = "Jordan — Front-Line Caregiver";
const ALEX = "Alex — Burned-Out Professional";
const SAM = "Sam — Sleep-Deprived Parent / Caregiver";

/** Seed list for the outreach tracker (from docs/target-organizations.md). */
export const STARTER_OUTREACH_TARGETS: StarterTarget[] = [
  // Top-priority checklist
  {
    organization: "First-responder wellness / peer-support programs",
    category: "First responders & public safety",
    persona: JORDAN,
    entryPath: "Facilitator / Managed"
  },
  {
    organization: "Hospital nurse-resilience & employee-wellness programs",
    category: "Healthcare & front-line medical",
    persona: JORDAN,
    entryPath: "Facilitator / Managed"
  },
  {
    organization: "Therapists & hypnotherapists (private practice)",
    category: "Mental & behavioral health providers",
    persona: ALEX,
    entryPath: "Affiliate"
  },
  {
    organization: "Corporate HR / benefits teams",
    category: "Corporate & high-stress professions",
    persona: ALEX,
    entryPath: "Direct"
  },
  {
    organization: "EAP vendors & provider networks",
    category: "Mental & behavioral health providers",
    persona: ALEX,
    entryPath: "Affiliate"
  },
  {
    organization: "Veteran service orgs & PTSD nonprofits",
    category: "Veterans & military",
    persona: JORDAN,
    entryPath: "Facilitator / Managed"
  },
  {
    organization: "Caregiver support organizations (Alzheimer's, postpartum)",
    category: "Parents & caregivers",
    persona: SAM,
    entryPath: "Affiliate"
  },
  {
    organization: "Wellness coaches & studios",
    category: "Coaches, studios & practitioners",
    persona: ALEX,
    entryPath: "Facilitator / Managed"
  },
  // First responders
  {
    organization: "Police / sheriff peer-support & wellness units",
    category: "First responders & public safety",
    persona: JORDAN,
    entryPath: "Facilitator / Managed"
  },
  {
    organization: "Fire departments & IAFF locals",
    category: "First responders & public safety",
    persona: JORDAN,
    entryPath: "Facilitator / Managed"
  },
  {
    organization: "EMS / paramedic agencies",
    category: "First responders & public safety",
    persona: JORDAN,
    entryPath: "Facilitator / Managed"
  },
  {
    organization: "911 dispatch / emergency communications centers",
    category: "First responders & public safety",
    persona: JORDAN,
    entryPath: "Facilitator / Managed"
  },
  // Healthcare
  {
    organization: "Nursing associations & unions",
    category: "Healthcare & front-line medical",
    persona: JORDAN,
    entryPath: "Affiliate"
  },
  {
    organization: "Traveling nurse agencies",
    category: "Healthcare & front-line medical",
    persona: JORDAN,
    entryPath: "Affiliate"
  },
  {
    organization: "Long-term care / hospice / home-health staff programs",
    category: "Healthcare & front-line medical",
    persona: JORDAN,
    entryPath: "Facilitator / Managed"
  },
  {
    organization: "Medical residency & GME wellness programs",
    category: "Healthcare & front-line medical",
    persona: JORDAN,
    entryPath: "Facilitator / Managed"
  },
  // Mental health
  {
    organization: "Group therapy practices & community mental health centers",
    category: "Mental & behavioral health providers",
    persona: ALEX,
    entryPath: "Affiliate"
  },
  {
    organization: "Trauma-informed care clinics & PTSD programs",
    category: "Mental & behavioral health providers",
    persona: JORDAN,
    entryPath: "Affiliate"
  },
  {
    organization: "Clinical hypnosis associations",
    category: "Mental & behavioral health providers",
    persona: ALEX,
    entryPath: "Affiliate"
  },
  // Corporate
  {
    organization: "Tech companies (engineering / on-call teams)",
    category: "Corporate & high-stress professions",
    persona: ALEX,
    entryPath: "Direct"
  },
  {
    organization: "Finance, consulting, and law firm wellness programs",
    category: "Corporate & high-stress professions",
    persona: ALEX,
    entryPath: "Direct"
  },
  {
    organization: "Startup / entrepreneur communities & accelerators",
    category: "Corporate & high-stress professions",
    persona: ALEX,
    entryPath: "Affiliate"
  },
  {
    organization: "Sales organizations (quota stress / recovery)",
    category: "Corporate & high-stress professions",
    persona: ALEX,
    entryPath: "Affiliate"
  },
  // Veterans
  {
    organization: "VA medical centers & Vet Centers",
    category: "Veterans & military",
    persona: JORDAN,
    entryPath: "Facilitator / Managed"
  },
  {
    organization: "Military family support & spouse groups",
    category: "Veterans & military",
    persona: SAM,
    entryPath: "Affiliate"
  },
  // Parents
  {
    organization: "New-parent / postpartum support & lactation networks",
    category: "Parents & caregivers",
    persona: SAM,
    entryPath: "Affiliate"
  },
  {
    organization: "Special-needs parent networks",
    category: "Parents & caregivers",
    persona: SAM,
    entryPath: "Affiliate"
  },
  {
    organization: "Pediatric & family-practice clinic partners",
    category: "Parents & caregivers",
    persona: SAM,
    entryPath: "Affiliate"
  },
  // Education
  {
    organization: "K-12 teachers & staff wellness / unions",
    category: "Education",
    persona: ALEX,
    entryPath: "Direct"
  },
  {
    organization: "University counseling & student wellness offices",
    category: "Education",
    persona: SAM,
    entryPath: "Facilitator / Managed"
  },
  // Recovery
  {
    organization: "Addiction recovery centers & sober-living programs",
    category: "Recovery & support communities",
    persona: JORDAN,
    entryPath: "Facilitator / Managed"
  },
  {
    organization: "Grief / bereavement support groups",
    category: "Recovery & support communities",
    persona: SAM,
    entryPath: "Affiliate"
  },
  {
    organization: "Chronic illness & pain support communities",
    category: "Recovery & support communities",
    persona: JORDAN,
    entryPath: "Affiliate"
  },
  // Faith & community
  {
    organization: "Faith communities with wellness / care ministries",
    category: "Faith & community organizations",
    persona: SAM,
    entryPath: "Affiliate"
  },
  {
    organization: "YMCA / community & senior centers",
    category: "Faith & community organizations",
    persona: SAM,
    entryPath: "Facilitator / Managed"
  },
  // Seniors
  {
    organization: "Retirement & assisted-living activity programs",
    category: "Seniors & aging",
    persona: SAM,
    entryPath: "Facilitator / Managed"
  },
  // Practitioners
  {
    organization: "Life / health / executive coaches",
    category: "Coaches, studios & practitioners",
    persona: ALEX,
    entryPath: "Affiliate"
  },
  {
    organization: "Yoga, meditation & breathwork studios",
    category: "Coaches, studios & practitioners",
    persona: ALEX,
    entryPath: "Affiliate"
  },
  {
    organization: "Massage, acupuncture & holistic wellness centers",
    category: "Coaches, studios & practitioners",
    persona: ALEX,
    entryPath: "Affiliate"
  }
];

/** Seeded outreach email templates (plain-text bodies admins can edit). */
export const STARTER_OUTREACH_EMAIL_TEMPLATES: {
  name: string;
  subject: string;
  bodyText: string;
  purpose: string;
}[] = [
  {
    name: "New member welcome (member-facing)",
    purpose: "new_member",
    subject: "Welcome New Member",
    bodyText: `Dear {{name}},

By becoming a member of ReachForTheStars.Today, you have made a valuable investment in your personal development. We would like to acknowledge and congratulate you for making that commitment to yourself!

We welcome you here and want to support you on your commitment to grow! Our ReachForTheStars.Today system is specifically designed to maximize the effectiveness of changing your subconscious programming in alignment with your chosen goals. The "Key" to your success is repetition so stick to the program.

When you log in it opens you to your member Console. Everything is accessible and explained from within the console.

Recommendations but not required:
- Two audios per night (repetition)
- Comfortable headset with mask (when listening while sleeping)

Have any questions? Call (800) GOAL NOW (462-5669) or email customerservice@reachforthestars.today

Open your console: {{siteUrl}}/play-options`
  },
  {
    name: "Partner / affiliate intro",
    purpose: "partner_intro",
    subject: "Partnership idea: Reach For The Stars for your community",
    bodyText: `Hello {{contactName}},

I'm reaching out about Reach For The Stars (ReachForTheStars.Today) — guided meditations that play while people fall asleep and during sleep, so goal work happens without another daytime chore.

Many {{organization}} members juggle stress, irregular sleep, and burnout. We partner with organizations through:
- Affiliate referrals (25% ongoing), or
- Facilitator / managed enrollment for cohorts

Happy to share a short overview, a free-trial path for your community, and sample messaging for {{persona}}.

Would a brief call this week work?

Warmly,
{{yourName}}
(800) GOAL NOW (462-5669)
{{siteUrl}}`
  },
  {
    name: "Facilitator / managed enrollment intro",
    purpose: "facilitator_intro",
    subject: "Managed wellness enrollment for your team",
    bodyText: `Hello {{contactName}},

Reach For The Stars offers facilitator-managed memberships so your organization can enroll people in a nightly audio program without asking them to build another daytime habit.

Members press Start at bedtime; recordings reinforce goals while falling asleep and during sleep. We can tailor onboarding and support for {{organization}}.

If useful, I can send a one-page overview and trial options.

Thank you,
{{yourName}}
{{siteUrl}}`
  }
];
export type ReferencePersona = {
  name: string;
  role: string;
  snapshot: string;
  message: string;
};

/** Condensed persona reference (from docs/personas.md) for the inline reference panel. */
export const REFERENCE_PERSONAS: ReferencePersona[] = [
  {
    name: "Alex — Burned-Out Professional",
    role: "Manager / knowledge worker / entrepreneur, 32–44",
    snapshot:
      "Competent and exhausted; brain won't power down at bedtime. Tried apps that add another daytime chore.",
    message:
      "No extra daytime chore — press Start at bedtime; evidence-informed, habit without willpower."
  },
  {
    name: "Jordan — Front-Line Caregiver",
    role: "Nurse, EMT, firefighter, police, hospital staff, 28–55",
    snapshot:
      "Carries stress home; irregular sleep and hypervigilance. Wants practical, trauma-informed tools, not fluff.",
    message:
      "Built for real stress — nightly nervous-system downshift; trusted voice; works when depleted."
  },
  {
    name: "Sam — Sleep-Deprived Parent / Caregiver",
    role: "Parent of young kids or caring for aging parents, 30–50",
    snapshot:
      "Fragmented sleep and mental load; late night is the only quiet time, when anxiety spikes.",
    message:
      "Self-care that doesn't steal from family — happens while already in bed; replace the scroll."
  },
  {
    name: "Chris — Spiritual Entrepreneur",
    role: "Coach, hypnotist, healer, or owner — spirit + profit, ~$65K+ aiming higher",
    snapshot:
      "Wants spiritual growth and income lift; rejects starving-healer myth. Will to learn; buys when growth is an investment.",
    message:
      "Highest potential physically, mentally, emotionally, spiritually, and financially — nightly, while you sleep."
  },
  {
    name: "Riley — Single Seeking a Match",
    role: "Single adult wanting a healthy romantic relationship, 28–48",
    snapshot:
      "Dating fatigue and old patterns; wants confidence and readiness without desperation or another daytime course.",
    message:
      "Become the match you want — relationship goals reinforce nightly while you sleep."
  },
  {
    name: "Morgan — High-Pressure Sales Professional",
    role: "AE, realtor, advisor, or founder on quota, 26–55",
    snapshot:
      "Income tied to confidence and follow-through; rejection and pre-close anxiety wreck sleep and momentum.",
    message:
      "Quota calm and bounce-back — sales confidence and prospecting drive reinforced at bedtime."
  },
  {
    name: "Taylor — Exam-Bound Professional",
    role: "Student or working pro facing boards, bar, CPA, certs, 22–45",
    snapshot:
      "Career hinge is a test date; knows the material but blanks under pressure; cramming steals sleep.",
    message:
      "Know it when it counts — calm recall and protected sleep through the exam window."
  },
  {
    name: "Casey — Working Actor / Performer",
    role: "Actor, voice, dancer, musician, or presenter, 20–50",
    snapshot:
      "Auditions and rejection loops; nerves steal presence; irregular schedule makes wellness fragile.",
    message:
      "Presence over perfection — creative flow and rejection recovery, one Start at bedtime."
  }
];

/** Marketing plan highlights (from docs/marketing-plan.md + Barnes/Brussel Session 2). */
export const REFERENCE_PLAN_HIGHLIGHTS: string[] = [
  "North Star: weekly active listeners and 7-day retention (shown on Marketing overview).",
  "Weekly blog cadence (required): one article every 7 days, each linking to a goal/wellness page and driving signup.",
  "Short-form: 3–5 clips/week on TikTok & Instagram Reels.",
  "Affiliate payouts: 25% ongoing of subscription revenue for as long as the referred member stays subscribed.",
  "Affiliate/facilitator targets: therapists, wellness coaches, community leaders, nonprofits — recruit Chris-like spiritual entrepreneurs who can pay and refer.",
  "USP: highest potential physically, mentally, emotionally, spiritually, and financially (financial piece is intentional).",
  "Ideal commercial client: need + ability to pay (~$65K+) + will to learn; intentional giveaway separate from core funnel.",
  "Offer bundles: Sleep Pack, Burnout Pack, First Responders Pack; annual discount for retention."
];
