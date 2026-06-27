import {
  GOAL_LANDING_SLUGS,
  HOMEPAGE_GOAL_CARDS,
  type GoalLandingSlug
} from "@/lib/homepage-goals";

export type { GoalLandingSlug };

export type GoalLandingContent = {
  slug: GoalLandingSlug;
  path: string;
  label: string;
  tagline: string;
  imageSrc: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroLead: string;
  eyebrow: string;
  sectionTitle: string;
  sectionSubtitle: string;
  howItHelps: { title: string; body: string }[];
  nightlySteps: { title: string; body: string }[];
  relatedSlugs: GoalLandingSlug[];
};

const SIGNUP = "/signup/step-1-subscription-selection";

const GOAL_DETAILS: Record<
  GoalLandingSlug,
  Omit<GoalLandingContent, "slug" | "path" | "label" | "tagline" | "imageSrc">
> = {
  health: {
    title: "Guided meditation for health and healthy longevity",
    metaTitle: "Guided Meditation for Health & Longevity | Reach For The Stars",
    metaDescription:
      "Personalized guided meditations for health, energy, sleep, and pain comfort — scheduled nightly while you fall asleep and during sleep.",
    heroLead:
      "Reach For The Stars rotates goal-based audios so your subconscious receives health-focused messages each night — healthy longevity, vibrant energy, and the body you want to delight in.",
    eyebrow: "Physical wellbeing",
    sectionTitle: "Nightly audios for your health goals",
    sectionSubtitle:
      "Select health-related priorities and hear guided meditations in rotation — preparation at bedtime, reinforcement during sleep.",
    howItHelps: [
      {
        title: "Holistic health focus",
        body:
          "Health goals in your rotation can include rest, resilience, pain comfort, and vitality — aligned with what you prioritize most."
      },
      {
        title: "Sleep supports recovery",
        body:
          "Audios play as you fall asleep and optionally again during sleep, when the mind is receptive and the body restores."
      },
      {
        title: "Facilitator support",
        body:
          "Work with a facilitator for personalized recordings (CGMR) alongside the goal-based library when you need extra customization."
      }
    ],
    nightlySteps: [
      {
        title: "Choose health goals",
        body: "Pick health and related priorities and order them by importance."
      },
      { title: "Start Session at bedtime", body: "Your schedule plays automatically each night." },
      { title: "Stay consistent", body: "Repetition over weeks builds the mindset shifts you want." }
    ],
    relatedSlugs: ["memory", "spirituality", "relationship"]
  },
  wealth: {
    title: "Guided meditation for wealth and financial abundance",
    metaTitle: "Guided Meditation for Wealth & Financial Abundance | Reach For The Stars",
    metaDescription:
      "Reinforce abundance, confidence, and financial goals with personalized guided meditations each night while you sleep.",
    heroLead:
      "Financial abundance starts with consistent mindset work. Reach For The Stars schedules wealth-focused guided meditations in rotation so prosperity messages reach your subconscious nightly.",
    eyebrow: "Financial growth",
    sectionTitle: "Build an abundance mindset while you sleep",
    sectionSubtitle:
      "Wealth goals rotate through your nightly lineup alongside preparation and optional second audios during sleep.",
    howItHelps: [
      {
        title: "Prosperity in rotation",
        body:
          "Wealth and success goals play on a structured schedule — not one recording on repeat, but intentional reinforcement over time."
      },
      {
        title: "Subconscious priming",
        body:
          "The transition into sleep is ideal for suggestion. Guided audios align your inner dialogue with the financial life you are building."
      },
      {
        title: "Update anytime",
        body:
          "Change your goal priorities when your focus shifts; new recordings enter your schedule based on your current list."
      }
    ],
    nightlySteps: [
      { title: "Set wealth goals", body: "Include abundance, success, and related priorities in your top ten." },
      { title: "Listen nightly", body: "One or two audios per night — default is two for deeper reinforcement." },
      { title: "Track momentum", body: "Members notice shifts in confidence and follow-through over weeks." }
    ],
    relatedSlugs: ["inspiration", "health", "relationship"]
  },
  relationship: {
    title: "Guided meditation for relationships and connection",
    metaTitle: "Guided Meditation for Relationships & Connection | Reach For The Stars",
    metaDescription:
      "Support joyful relationships with personalized guided meditations at night. Reinforce love, connection, and emotional openness while you sleep.",
    heroLead:
      "Whether you want a joyful new relationship or a deeper present one, Reach For The Stars rotates relationship-focused guided meditations so your subconscious receives supportive messages each night.",
    eyebrow: "Love & connection",
    sectionTitle: "Nightly reinforcement for relationship goals",
    sectionSubtitle:
      "Relationship priorities play in rotation with your other goals — consistent, personalized, and effortless at bedtime.",
    howItHelps: [
      {
        title: "Emotional openness",
        body:
          "Guided messages can reinforce patience, warmth, and confidence — qualities that support healthier connection."
      },
      {
        title: "Aligned with your priorities",
        body:
          "You choose and rank goals; relationship audios appear in your schedule according to your current focus."
      },
      {
        title: "Calm at night",
        body:
          "Bedtime relaxation reduces reactivity and worry — a better foundation for how you show up with others."
      }
    ],
    nightlySteps: [
      { title: "Choose relationship goals", body: "Prioritize connection, love, and related themes." },
      { title: "Press Start Session", body: "Your lineup plays while you fall asleep." },
      { title: "Notice daily shifts", body: "Consistent practice supports how you relate over time." }
    ],
    relatedSlugs: ["spirituality", "health", "inspiration"]
  },
  memory: {
    title: "Guided meditation for memory and mental focus",
    metaTitle: "Guided Meditation for Memory & Mental Focus | Reach For The Stars",
    metaDescription:
      "Improve memory and focus with personalized guided meditations at night. Brain training and mental clarity while you sleep.",
    heroLead:
      "The memory and mental focus you want now and lifelong — Reach For The Stars reinforces learning and clarity through goal-based audios scheduled each night.",
    eyebrow: "Memory & focus",
    sectionTitle: "Mental excellence through nightly repetition",
    sectionSubtitle:
      "Memory goals rotate in your schedule alongside preparation and optional second audios during sleep.",
    howItHelps: [
      {
        title: "Memory in your rotation",
        body:
          "Choose memory and mental excellence among your priorities; relevant guided content plays on schedule."
      },
      {
        title: "Sleep and consolidation",
        body:
          "Sleep supports memory consolidation. Reinforcing focus messages at night aligns with how the brain processes learning."
      },
      {
        title: "Structured habit",
        body:
          "No playlist to maintain — press Start Session and your personalized rotation handles the rest."
      }
    ],
    nightlySteps: [
      { title: "Select memory goals", body: "Include memory enhancement and focus in your prioritized list." },
      { title: "Nightly audios", body: "Bedtime plus optional second play during sleep." },
      { title: "Stay consistent", body: "Members report clearer recall with steady use over weeks." }
    ],
    relatedSlugs: ["inspiration", "health", "wealth"]
  },
  inspiration: {
    title: "Guided meditation for inspiration and creativity",
    metaTitle: "Guided Meditation for Inspiration & Creativity | Reach For The Stars",
    metaDescription:
      "Access inspiration at will with guided meditations for creative and entrepreneurial goals — personalized audios each night.",
    heroLead:
      "Inspiration at will for creative and entrepreneurial endeavors — Reach For The Stars schedules inspiration-focused guided meditations so motivation reaches your subconscious nightly.",
    eyebrow: "Creativity & drive",
    sectionTitle: "Unlock inspiration on a nightly schedule",
    sectionSubtitle:
      "Creative and entrepreneurial goals rotate through your personalized lineup with consistent repetition.",
    howItHelps: [
      {
        title: "Creative priming",
        body:
          "Guided audios reinforce openness, motivation, and follow-through — especially valuable before sleep clears mental clutter."
      },
      {
        title: "Entrepreneurial focus",
        body:
          "Pair inspiration goals with wealth and success priorities for a holistic abundance and action mindset."
      },
      {
        title: "Effortless consistency",
        body:
          "The program runs at bedtime so inspiration work does not compete with your daytime creative flow."
      }
    ],
    nightlySteps: [
      { title: "Set inspiration goals", body: "Prioritize creativity, motivation, and related themes." },
      { title: "Listen each night", body: "Your rotation keeps inspiration messages fresh over weeks." },
      { title: "Act on ideas", body: "Members carry renewed drive into daytime projects." }
    ],
    relatedSlugs: ["wealth", "memory", "spirituality"]
  },
  spirituality: {
    title: "Guided meditation for spirituality and inner connection",
    metaTitle: "Guided Meditation for Spirituality & Inner Connection | Reach For The Stars",
    metaDescription:
      "Deepen spirituality with personalized guided meditations at night. Greater connection, peace, and inner alignment while you sleep.",
    heroLead:
      "A greater connection with your spirituality — Reach For The Stars rotates spirit-focused guided meditations so inner alignment is reinforced each night.",
    eyebrow: "Inner life",
    sectionTitle: "Spiritual growth through nightly practice",
    sectionSubtitle:
      "Spirituality goals play in rotation with preparation and optional reinforcement during sleep.",
    howItHelps: [
      {
        title: "Sacred routine",
        body:
          "Bedtime becomes a consistent spiritual practice without adding another item to your daytime schedule."
      },
      {
        title: "Peace and presence",
        body:
          "Guided relaxation and intention support the calm that many people associate with deeper spiritual connection."
      },
      {
        title: "Personal path",
        body:
          "You choose goals that match your beliefs and priorities; the schedule adapts when you update them."
      }
    ],
    nightlySteps: [
      { title: "Choose spirituality goals", body: "Include connection, peace, and related priorities." },
      { title: "Start Session at night", body: "Audios play as you fall asleep and during sleep." },
      { title: "Deepen over time", body: "Repetition supports lasting inner alignment." }
    ],
    relatedSlugs: ["relationship", "health", "inspiration"]
  }
};

export const GOAL_LANDING_PAGES: GoalLandingContent[] = HOMEPAGE_GOAL_CARDS.map((card) => ({
  slug: card.slug,
  path: card.path,
  label: card.label,
  tagline: card.tagline,
  imageSrc: card.imageSrc,
  ...GOAL_DETAILS[card.slug]
}));

export function getGoalLandingPage(slug: string): GoalLandingContent | undefined {
  return GOAL_LANDING_PAGES.find((page) => page.slug === slug);
}

export function getRelatedGoalPages(slugs: GoalLandingSlug[]): GoalLandingContent[] {
  return slugs
    .map((slug) => getGoalLandingPage(slug))
    .filter((page): page is GoalLandingContent => page != null);
}

export const GOAL_SIGNUP_HREF = SIGNUP;

/** @deprecated Use GOAL_LANDING_PAGES */
export const TOPIC_LANDING_PAGES = GOAL_LANDING_PAGES;
/** @deprecated Use GoalLandingSlug */
export type TopicLandingSlug = GoalLandingSlug;
/** @deprecated Use getGoalLandingPage */
export const getTopicLandingPage = getGoalLandingPage;
/** @deprecated Use getRelatedGoalPages */
export const getRelatedTopicPages = getRelatedGoalPages;
/** @deprecated Use GOAL_SIGNUP_HREF */
export const TOPIC_SIGNUP_HREF = SIGNUP;
