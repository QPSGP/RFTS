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
  wealth: ["abundance", "wealth", "financial", "prosperity", "money", "success", "income"],
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
  spirituality: ["spiritual", "psychic", "metaphysical", "soul", "meditation", "spark"],
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
  "pain-relief": ["pain", "comfort", "fibromyalgia", "natural pain", "relief", "heal"],
  "memory-improvement": ["memory", "focus", "recall", "mental", "learn", "attention", "brain"],
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
  "will-power": ["will", "discipline", "habit", "stop", "success", "learn", "power"],
  "self-awareness": ["aware", "self", "mindful", "insight", "growth", "clarity"]
};

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
  if (content.skuCode?.trim()) score += 1;
  return score;
}

function toCards(pages: AudioLandingContent[], limit: number): AudioLandingCard[] {
  return pages.slice(0, limit).map((page) => ({
    path: page.path,
    title: page.title,
    slug: page.slug,
    skuCode: page.skuCode,
    summary: page.summary
  }));
}

export function findRelatedAudioLandingsForGoal(
  goalSlug: GoalLandingSlug,
  library: LibraryItem[],
  limit = 4
): AudioLandingCard[] {
  const keywords = GOAL_AUDIO_KEYWORDS[goalSlug] ?? [];
  const indexable = buildIndexableAudioLandingContent(library);
  const ranked = indexable
    .map((page) => ({ page, score: scoreAudioForKeywords(page, keywords) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.page.title.localeCompare(b.page.title, undefined, { sensitivity: "base" });
    })
    .map((row) => row.page);
  return toCards(ranked, limit);
}

export function findRelatedAudioLandingsForTopic(
  topicSlug: TopicLandingSlug,
  library: LibraryItem[],
  limit = 4
): AudioLandingCard[] {
  const keywords = TOPIC_AUDIO_KEYWORDS[topicSlug] ?? [];
  const indexable = buildIndexableAudioLandingContent(library);
  const ranked = indexable
    .map((page) => ({ page, score: scoreAudioForKeywords(page, keywords) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.page.title.localeCompare(b.page.title, undefined, { sensitivity: "base" });
    })
    .map((row) => row.page);
  return toCards(ranked, limit);
}

export function findRelatedAudioLandingsForBlogPost(
  library: LibraryItem[],
  options: { topicSlug?: TopicLandingSlug; goalSlug?: GoalLandingSlug },
  limit = 4
): AudioLandingCard[] {
  if (options.topicSlug) {
    return findRelatedAudioLandingsForTopic(options.topicSlug, library, limit);
  }
  if (options.goalSlug) {
    return findRelatedAudioLandingsForGoal(options.goalSlug, library, limit);
  }
  return [];
}
