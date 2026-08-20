/**
 * Map lead-card / CRM interests to a weekly conversion-email sequence.
 * One unique template per interest, in the order they were marked.
 */
import { EVENT_LEAD_CARD_GOALS, EVENT_LEAD_CORE_GOALS } from "@/lib/event-leads";
import { leadCardInterestTemplateName } from "@/lib/lead-card-interest-emails";
import { WELLNESS_BENEFIT_LINKS } from "@/lib/meditation-benefits";
import { MEMBER_CONVERT_INTEREST_EMAILS } from "@/lib/member-conversion-emails";

export type InterestSequenceStep = {
  interest: string;
  templateName: string;
};

const CORE_TEMPLATE_BY_LABEL: Record<string, string> = {
  Health: "Convert interest - Health",
  Wealth: "Convert interest - Wealth",
  Relationship: "Convert interest - Relationship",
  Memory: "Convert interest - Memory",
  Inspiration: "Convert interest - Inspiration",
  Spirituality: "Convert interest - Spirituality",
  "Overcoming Addiction": "Convert interest - Overcoming Addiction",
  "Balanced Life": "Convert interest - Balanced Life"
};

const WELLNESS_TEMPLATE_BY_LABEL: Record<string, string> = {
  "Reduced Stress": "Convert interest - Stress relief",
  "Burnout Recovery": "Convert interest - Burnout recovery",
  "Memory Enhancement": "Convert interest - Memory",
  "Blood Pressure Regulation": "Convert interest - Blood pressure",
  "Better Pain Management": "Convert interest - Pain relief",
  "Better Sleep": "Convert interest - Sleep",
  "Physical/Psychological Resilience": "Convert interest - Resilience",
  "Increased Focus & Attention Span": "Convert interest - Memory",
  "Improved Emotional Health": "Convert interest - Emotional health",
  "Enhanced Will Power": "Convert interest - Will power",
  "Greater Self-Awareness": "Convert interest - Self-awareness"
};

const CARD_GOAL_SET = new Set<string>(EVENT_LEAD_CARD_GOALS);
const CORE_GOAL_SET = new Set<string>(EVENT_LEAD_CORE_GOALS);
const WELLNESS_LABEL_SET = new Set(WELLNESS_BENEFIT_LINKS.map((b) => b.label));
const CONVERT_INTEREST_NAMES = new Set(
  MEMBER_CONVERT_INTEREST_EMAILS.map((t) => t.name)
);

function splitInterestBlob(raw: string): string[] {
  return raw
    .split(/[,;|/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

/** Pull goal checkboxes from an event-lead payload plus free-text interest. */
export function extractLeadGoalInterests(
  payload: unknown,
  interest?: string | null
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    const key = value.trim();
    if (!key) return;
    const norm = key.toLowerCase();
    if (seen.has(norm)) return;
    seen.add(norm);
    out.push(key);
  };

  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    for (const label of asStringArray(p.goalInterests)) push(label);
    const practice = p.practice;
    if (practice && typeof practice === "object") {
      for (const label of asStringArray(
        (practice as { goalInterests?: unknown }).goalInterests
      )) {
        push(label);
      }
    }
    const consumer = p.consumer;
    if (consumer && typeof consumer === "object") {
      for (const label of asStringArray(
        (consumer as { goalInterests?: unknown }).goalInterests
      )) {
        push(label);
      }
    }
  }

  if (interest?.trim()) {
    for (const part of splitInterestBlob(interest)) push(part);
  }

  return out;
}

export function templateNameForInterest(interest: string): string | null {
  const raw = interest.trim();
  if (!raw) return null;

  if (CARD_GOAL_SET.has(raw)) {
    return leadCardInterestTemplateName(raw);
  }
  if (CORE_GOAL_SET.has(raw) && CORE_TEMPLATE_BY_LABEL[raw]) {
    return CORE_TEMPLATE_BY_LABEL[raw];
  }
  if (WELLNESS_LABEL_SET.has(raw) && WELLNESS_TEMPLATE_BY_LABEL[raw]) {
    return WELLNESS_TEMPLATE_BY_LABEL[raw];
  }

  const lower = raw.toLowerCase();
  for (const label of EVENT_LEAD_CARD_GOALS) {
    if (label.toLowerCase() === lower) {
      return leadCardInterestTemplateName(label);
    }
  }
  for (const [label, name] of Object.entries(CORE_TEMPLATE_BY_LABEL)) {
    if (label.toLowerCase() === lower) return name;
  }
  for (const [label, name] of Object.entries(WELLNESS_TEMPLATE_BY_LABEL)) {
    if (label.toLowerCase() === lower) return name;
  }

  const convertGuess = `Convert interest - ${raw}`;
  if (CONVERT_INTEREST_NAMES.has(convertGuess)) return convertGuess;

  return null;
}

/** Unique templates in checkbox order. Duplicate landing templates are skipped. */
export function planInterestSequence(interests: string[]): InterestSequenceStep[] {
  const steps: InterestSequenceStep[] = [];
  const usedTemplates = new Set<string>();
  for (const interest of interests) {
    const templateName = templateNameForInterest(interest);
    if (!templateName || usedTemplates.has(templateName)) continue;
    usedTemplates.add(templateName);
    steps.push({ interest: interest.trim(), templateName });
  }
  return steps;
}
