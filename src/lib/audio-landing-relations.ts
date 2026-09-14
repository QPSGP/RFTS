import {
  buildIndexableAudioLandingContent,
  type AudioLandingContent
} from "@/lib/audio-landing";
import type { GoalLandingSlug } from "@/lib/goal-landing-pages";
import type { TopicLandingSlug } from "@/lib/topic-landing-pages";
import type { LibraryItem } from "@/lib/types";

export type AudioLandingCard = Pick<
  AudioLandingContent,
  "path" | "title" | "slug" | "skuCode" | "summary"
>;

type RelatedAudioPick = {
  /** Ordered SKUs to show first when present in the public library. */
  prefer?: string[];
  /** SKUs never shown on this page. */
  exclude?: string[];
  /** Drop COVID-era variants (T54CV19, titles containing CV19). */
  excludeCv19?: boolean;
};

const GOAL_AUDIO_KEYWORDS: Record<GoalLandingSlug, string[]> = {
  health: [
    "health",
    "immune",
    "pain",
    "energy",
    "sleep",
    "rejuvenation",
    "balance",
    "longevity",
    "vision",
    "gut",
    "jaw"
  ],
  wealth: ["abundance", "wealth", "financial", "prosperity", "money", "success", "income", "sales"],
  relationship: [
    "relationship",
    "love",
    "partner",
    "couple",
    "marriage",
    "attract",
    "abusive",
    "joy"
  ],
  memory: ["memory", "focus", "recall", "mental", "learn", "attention", "brain"],
  inspiration: ["inspiration", "creative", "creativity", "motivation", "entrepreneur"],
  spirituality: ["spiritual", "psychic", "metaphysical", "soul", "meditation", "spark", "serenity"],
  "overcoming-addiction": [
    "addiction",
    "smoking",
    "drinking",
    "alcohol",
    "overeating",
    "habit",
    "stop"
  ],
  "balanced-life": ["balance", "habit", "stress", "success", "calm", "wellbeing", "life"]
};

const TOPIC_AUDIO_KEYWORDS: Record<TopicLandingSlug, string[]> = {
  "sleep-meditation": ["sleep", "snor", "rest", "insomnia", "bedtime", "night"],
  "stress-relief": ["stress", "relax", "calm", "anxiety", "success", "immune", "tension"],
  "burnout-recovery": [
    "burnout",
    "stress",
    "relax",
    "calm",
    "recovery",
    "balance",
    "sleep",
    "exhaust"
  ],
  "pain-relief": ["pain", "comfort", "fibromyalgia", "natural pain", "relief", "heal"],
  "memory-improvement": ["memory", "focus", "recall", "mental", "learn", "attention", "brain", "student"],
  "blood-pressure-regulation": [
    "blood pressure",
    "pressure",
    "cardio",
    "heart",
    "relax",
    "calm"
  ],
  "resilience-meditation": [
    "resilience",
    "recovery",
    "disaster",
    "first responder",
    "stress",
    "trauma",
    "strong"
  ],
  "emotional-health": ["emotion", "calm", "balance", "stress", "joy", "heal", "relationship"],
  "will-power": ["will", "discipline", "habit", "stop", "success", "learn", "power", "procrastination"],
  "self-awareness": ["aware", "self", "mindful", "insight", "growth", "clarity"]
};

const GOAL_RELATED_AUDIO: Record<GoalLandingSlug, RelatedAudioPick> = {
  health: { prefer: ["T58", "T29"], exclude: ["T04"] },
  wealth: { prefer: ["T35", "T33", "S01D"], exclude: ["T19", "T20"] },
  relationship: {
    prefer: ["T23", "T12", "T10", "S01A", "T04"],
    exclude: ["T38", "T39", "T56", "T56B", "T56C"]
  },
  memory: { prefer: ["T26", "S01B", "T04"], exclude: ["T14", "T01"] },
  inspiration: { prefer: ["T18", "S01C", "T22"], exclude: ["T33", "T19"] },
  spirituality: { prefer: ["T56", "T44", "T45"] },
  "overcoming-addiction": { prefer: ["T59"] },
  "balanced-life": { prefer: ["S01A"], exclude: ["T19", "T03"], excludeCv19: true }
};

const TOPIC_RELATED_AUDIO: Record<TopicLandingSlug, RelatedAudioPick> = {
  "sleep-meditation": { prefer: ["T16", "T15"], exclude: ["T66", "T19"], excludeCv19: true },
  "stress-relief": { prefer: ["S01A", "T54"], exclude: ["T03", "T66"], excludeCv19: true },
  "burnout-recovery": {
    prefer: ["S01A", "T16", "T04", "S01D"],
    exclude: ["T66", "T03"],
    excludeCv19: true
  },
  "pain-relief": { exclude: ["T29", "T39"] },
  "memory-improvement": { prefer: ["T14", "T01", "S01A"] },
  "blood-pressure-regulation": {
    prefer: ["S01A", "T54"],
    exclude: ["T03", "T66"],
    excludeCv19: true
  },
  "resilience-meditation": {
    prefer: ["T04", "S01A"],
    exclude: ["T66", "T03", "T59"],
    excludeCv19: true
  },
  "emotional-health": { prefer: ["T04", "S01E", "T54"], exclude: ["T66"], excludeCv19: true },
  "will-power": { prefer: ["T59", "T02", "S01C", "S01B"], exclude: ["T22", "T01", "T14"] },
  "self-awareness": { prefer: ["T18", "T43", "T44"], exclude: ["T39", "T55", "T24"] }
};

/** Pad S1A / T4 style codes so they match S01A / T04. */
export function normalizeRelatedSku(code: string | null | undefined): string {
  const compact = String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const match = compact.match(/^([A-Z]+)(\d+)([A-Z]+)?$/);
  if (!match) return compact;
  return `${match[1]}${match[2].padStart(2, "0")}${match[3] || ""}`;
}

function searchableText(content: AudioLandingContent): string {
  return [content.title, content.summary, content.skuCode || ""].join(" ").toLowerCase();
}

function scoreAudioForKeywords(content: AudioLandingContent, keywords: string[]): number {
  const text = searchableText(content);
  let score = 0;
  for (const keyword of keywords) {
    const normalized = keyword.toLowerCase();
    if (text.includes(normalized)) {
      score += normalized.includes(" ") ? 3 : 1;
    }
  }
  if (score > 0 && content.skuCode?.trim()) score += 1;
  return score;
}

function mentionsCv19(content: AudioLandingContent): boolean {
  return /cv\s*-?\s*19|covid/.test(`${searchableText(content)} ${content.skuCode || ""}`);
}

function skuInList(skuCode: string | undefined, list: string[] | undefined): boolean {
  if (!skuCode || !list?.length) return false;
  const normalized = normalizeRelatedSku(skuCode);
  return list.some((sku) => normalizeRelatedSku(sku) === normalized);
}

function toCards(pages: AudioLandingContent[]): AudioLandingCard[] {
  return pages.map((page) => ({
    path: page.path,
    title: page.title,
    slug: page.slug,
    skuCode: page.skuCode,
    summary: page.summary
  }));
}

const DEFAULT_RELATED_EXCLUDE = ["T19", "T20"];

function pickRelatedAudios(
  indexable: AudioLandingContent[],
  keywords: string[],
  pick: RelatedAudioPick,
  limit = 2
): AudioLandingCard[] {
  const excluded = [...DEFAULT_RELATED_EXCLUDE, ...(pick.exclude ?? [])].filter(
    (sku) => !skuInList(sku, pick.prefer)
  );
  const eligible = indexable.filter((page) => {
    if (skuInList(page.skuCode, excluded)) return false;
    if (pick.excludeCv19 && mentionsCv19(page)) return false;
    return true;
  });
  const bySku = new Map<string, AudioLandingContent>();
  for (const page of eligible) {
    const key = normalizeRelatedSku(page.skuCode);
    if (key && !bySku.has(key)) bySku.set(key, page);
  }

  const selected: AudioLandingContent[] = [];
  const seen = new Set<string>();
  for (const sku of pick.prefer ?? []) {
    const page = bySku.get(normalizeRelatedSku(sku));
    if (!page) continue;
    const key = normalizeRelatedSku(page.skuCode);
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(page);
  }

  const ranked = eligible
    .map((page) => ({ page, score: scoreAudioForKeywords(page, keywords) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.page.title.localeCompare(b.page.title, undefined, { sensitivity: "base" });
    })
    .map((row) => row.page);

  for (const page of ranked) {
    if (selected.length >= limit) break;
    const key = normalizeRelatedSku(page.skuCode);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    selected.push(page);
  }

  return toCards(selected.slice(0, limit));
}

export function findRelatedAudioLandingsForGoal(
  goalSlug: GoalLandingSlug,
  library: LibraryItem[],
  limit = 2
): AudioLandingCard[] {
  const keywords = GOAL_AUDIO_KEYWORDS[goalSlug] ?? [];
  const pick = GOAL_RELATED_AUDIO[goalSlug] ?? {};
  return pickRelatedAudios(
    buildIndexableAudioLandingContent(library),
    keywords,
    pick,
    limit
  );
}

export function findRelatedAudioLandingsForTopic(
  topicSlug: TopicLandingSlug,
  library: LibraryItem[],
  limit = 2
): AudioLandingCard[] {
  const keywords = TOPIC_AUDIO_KEYWORDS[topicSlug] ?? [];
  const pick = TOPIC_RELATED_AUDIO[topicSlug] ?? {};
  return pickRelatedAudios(
    buildIndexableAudioLandingContent(library),
    keywords,
    pick,
    limit
  );
}

export function findRelatedAudioLandingsForBlogPost(
  library: LibraryItem[],
  options: { topicSlug?: TopicLandingSlug; goalSlug?: GoalLandingSlug },
  limit = 2
): AudioLandingCard[] {
  if (options.topicSlug) {
    return findRelatedAudioLandingsForTopic(options.topicSlug, library, limit);
  }
  if (options.goalSlug) {
    return findRelatedAudioLandingsForGoal(options.goalSlug, library, limit);
  }
  return [];
}
