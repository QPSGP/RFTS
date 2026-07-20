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

export type OutreachStatusId = (typeof OUTREACH_STATUSES)[number]["id"];

export const outreachStatusLabel = (id: string): string =>
  OUTREACH_STATUSES.find((s) => s.id === id)?.label ?? id;

/** How a target is expected to convert to members. */
export const OUTREACH_ENTRY_PATHS = [
  "Direct",
  "Affiliate",
  "Facilitator / Managed"
] as const;

/** Personas from docs/personas.md, used to tag outreach targets. */
export const OUTREACH_PERSONAS = [
  "Alex — Burned-Out Professional",
  "Jordan — Front-Line Caregiver",
  "Sam — Sleep-Deprived Parent / Caregiver"
] as const;

/** Segment categories from docs/target-organizations.md. */
export const OUTREACH_CATEGORIES = [
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

/** One-click starter list for the outreach tracker (top-priority checklist). */
export const STARTER_OUTREACH_TARGETS: {
  organization: string;
  category: string;
  persona: string;
  entryPath: string;
}[] = [
  {
    organization: "First-responder wellness / peer-support programs",
    category: "First responders & public safety",
    persona: "Jordan — Front-Line Caregiver",
    entryPath: "Facilitator / Managed"
  },
  {
    organization: "Hospital nurse-resilience & employee-wellness programs",
    category: "Healthcare & front-line medical",
    persona: "Jordan — Front-Line Caregiver",
    entryPath: "Facilitator / Managed"
  },
  {
    organization: "Therapists & hypnotherapists (private practice)",
    category: "Mental & behavioral health providers",
    persona: "Alex — Burned-Out Professional",
    entryPath: "Affiliate"
  },
  {
    organization: "Corporate HR / benefits teams",
    category: "Corporate & high-stress professions",
    persona: "Alex — Burned-Out Professional",
    entryPath: "Direct"
  },
  {
    organization: "EAP vendors & provider networks",
    category: "Mental & behavioral health providers",
    persona: "Alex — Burned-Out Professional",
    entryPath: "Affiliate"
  },
  {
    organization: "Veteran service orgs & PTSD nonprofits",
    category: "Veterans & military",
    persona: "Jordan — Front-Line Caregiver",
    entryPath: "Facilitator / Managed"
  },
  {
    organization: "Caregiver support organizations (Alzheimer's, postpartum)",
    category: "Parents & caregivers",
    persona: "Sam — Sleep-Deprived Parent / Caregiver",
    entryPath: "Affiliate"
  },
  {
    organization: "Wellness coaches & studios",
    category: "Coaches, studios & practitioners",
    persona: "Alex — Burned-Out Professional",
    entryPath: "Facilitator / Managed"
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
  }
];

/** Marketing plan highlights (from docs/marketing-plan.md). */
export const REFERENCE_PLAN_HIGHLIGHTS: string[] = [
  "North Star: weekly active listeners and 7-day retention (shown on Marketing overview).",
  "Weekly blog cadence (required): one article every 7 days, each linking to a goal/wellness page and driving signup.",
  "Short-form: 3–5 clips/week on TikTok & Instagram Reels.",
  "Affiliate payouts: 25% ongoing of subscription revenue for as long as the referred member stays subscribed.",
  "Affiliate/facilitator targets: therapists, wellness coaches, community leaders, nonprofits.",
  "Offer bundles: Sleep Pack, Burnout Pack, First Responders Pack; annual discount for retention."
];
