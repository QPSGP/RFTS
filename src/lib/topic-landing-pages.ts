export type TopicLandingSlug =
  | "sleep-meditation"
  | "stress-relief"
  | "pain-relief"
  | "memory-improvement";

export type TopicLandingContent = {
  slug: TopicLandingSlug;
  path: string;
  pill: string;
  /** Primary H1 — aligned with common search queries */
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroLead: string;
  eyebrow: string;
  sectionTitle: string;
  sectionSubtitle: string;
  howItHelps: { title: string; body: string }[];
  nightlySteps: { title: string; body: string }[];
  relatedSlugs: TopicLandingSlug[];
};

const SIGNUP = "/signup/step-1-subscription-selection";

export const TOPIC_LANDING_PAGES: TopicLandingContent[] = [
  {
    slug: "sleep-meditation",
    path: "/sleep-meditation",
    pill: "Sleep",
    title: "Guided sleep meditation for better sleep",
    metaTitle: "Guided Sleep Meditation for Better Sleep | Reach For The Stars",
    metaDescription:
      "Fall asleep faster with guided sleep meditation and personalized nightly audios. Goal-based sessions while you sleep — no app juggling.",
    heroLead:
      "If you search for guided sleep meditation, sleep hypnosis, or how to sleep better at night, Reach For The Stars delivers personalized audios scheduled while you fall asleep and during sleep.",
    eyebrow: "Better sleep",
    sectionTitle: "Why nightly guided audios help sleep",
    sectionSubtitle:
      "Consistent relaxation at bedtime and gentle repetition during sleep support the habits that make rest easier.",
    howItHelps: [
      {
        title: "Relaxation before sleep",
        body:
          "Each night begins with a short preparation audio, then your first goal recording — a structured wind-down instead of scrolling or worrying."
      },
      {
        title: "Reinforcement while you sleep",
        body:
          "Optional second audios play about 2.5 hours later, reinforcing calm and sleep-friendly patterns during restorative sleep."
      },
      {
        title: "Personalized to your goals",
        body:
          "Choose priorities like rest, balance, or stress relief. Your schedule rotates goals so sleep support stays fresh, not repetitive."
      }
    ],
    nightlySteps: [
      {
        title: "Pick sleep-related goals",
        body: "Select focus areas that matter to you — rest, calm, balance, or related priorities."
      },
      {
        title: "Press Start Session at bedtime",
        body: "Your personalized lineup plays automatically each night."
      },
      {
        title: "Build the habit",
        body: "Nightly consistency is what makes guided sleep meditation stick over time."
      }
    ],
    relatedSlugs: ["stress-relief", "pain-relief", "memory-improvement"]
  },
  {
    slug: "stress-relief",
    path: "/stress-relief",
    pill: "Stress relief",
    title: "Stress relief meditation and guided relaxation",
    metaTitle: "Stress Relief Meditation & Guided Relaxation | Reach For The Stars",
    metaDescription:
      "Reduce stress and anxiety with guided relaxation and goal-based audios at night. Personalized stress relief meditation while you sleep.",
    heroLead:
      "Looking for stress relief meditation, guided relaxation for anxiety, or ways to calm your mind? Reach For The Stars uses personalized nightly audios to reinforce calm, focus, and emotional balance.",
    eyebrow: "Calm & resilience",
    sectionTitle: "How guided relaxation reduces stress",
    sectionSubtitle:
      "Research on meditation and mindfulness supports lower stress, better mood, and improved emotional regulation with regular practice.",
    howItHelps: [
      {
        title: "Calm at a receptive time",
        body:
          "The transition into sleep is a natural window for suggestion and relaxation — ideal for stress relief meditation without adding another daytime task."
      },
      {
        title: "Goal-based messaging",
        body:
          "Your audios align with chosen priorities (calm, confidence, balance) so relaxation connects to what you actually need."
      },
      {
        title: "Repetition without effort",
        body:
          "Hearing supportive messages on a schedule strengthens new mental patterns — the same principle behind habit and focus training."
      }
    ],
    nightlySteps: [
      {
        title: "Choose stress and calm goals",
        body: "Prioritize what you want to feel more of — peace, confidence, balance, or focus."
      },
      {
        title: "Listen nightly",
        body: "One or two audios per night; default is two for deeper reinforcement."
      },
      {
        title: "Notice daily shifts",
        body: "Members report using techniques from sessions to calm themselves during the day."
      }
    ],
    relatedSlugs: ["sleep-meditation", "pain-relief", "memory-improvement"]
  },
  {
    slug: "pain-relief",
    path: "/pain-relief",
    pill: "Pain relief",
    title: "Pain relief meditation and natural pain management",
    metaTitle: "Pain Relief Meditation & Natural Pain Management | Reach For The Stars",
    metaDescription:
      "Support natural pain relief with guided meditation and personalized nightly audios. Mind-body tools for chronic pain, tension, and sleep-related discomfort.",
    heroLead:
      "People search for pain relief meditation, natural pain management, and mind-body approaches to chronic pain. Reach For The Stars combines guided audios with goal-based scheduling while you sleep.",
    eyebrow: "Mind-body support",
    sectionTitle: "Meditation for pain coping and comfort",
    sectionSubtitle:
      "Clinical sources note meditation can help with pain perception, tension, and sleep when used consistently alongside medical care.",
    howItHelps: [
      {
        title: "Relaxation for tension",
        body:
          "Guided relaxation can ease muscle tension and the stress that amplifies pain — especially when practiced at bedtime."
      },
      {
        title: "Personalized CGMR option",
        body:
          "Facilitators can assign customized recordings (CGMR) tailored to a member’s situation, alongside the goal-based library."
      },
      {
        title: "Sleep and pain connection",
        body:
          "Better sleep supports recovery. Nightly audios address both rest and comfort goals in one membership."
      }
    ],
    nightlySteps: [
      {
        title: "Work with your facilitator or goals",
        body: "Select health and comfort-related goals, or use facilitator-assigned personalized audio."
      },
      {
        title: "Nightly guided sessions",
        body: "Preparation plus goal audios — optional second play during sleep."
      },
      {
        title: "Track what helps",
        body: "Consistent use lets you notice which messages and goals support your comfort over weeks."
      }
    ],
    relatedSlugs: ["sleep-meditation", "stress-relief", "memory-improvement"]
  },
  {
    slug: "memory-improvement",
    path: "/memory-improvement",
    pill: "Memory & focus",
    title: "Memory improvement meditation and better focus",
    metaTitle: "Memory Improvement Meditation & Better Focus | Reach For The Stars",
    metaDescription:
      "Improve memory and focus with guided meditation and nightly goal audios. Brain training while you sleep with Reach For The Stars.",
    heroLead:
      "Searching for memory improvement meditation, how to improve memory and focus, or brain training while you sleep? Reach For The Stars reinforces learning and mental clarity through personalized nightly audios.",
    eyebrow: "Memory & focus",
    sectionTitle: "Build focus and memory with repetition",
    sectionSubtitle:
      "Studies on meditation link regular practice to attention, working memory, and structural brain changes over time.",
    howItHelps: [
      {
        title: "Memory as a goal category",
        body:
          "Choose memory, learning, and mental excellence among your priorities so your nightly schedule includes relevant guided content."
      },
      {
        title: "Sleep and consolidation",
        body:
          "Sleep plays a key role in memory consolidation. Reinforcing focus and recall messages during sleep aligns with how the brain processes learning."
      },
      {
        title: "Structured rotation",
        body:
          "Goals rotate in order so memory and focus themes are reinforced regularly — not one-off sessions you forget to repeat."
      }
    ],
    nightlySteps: [
      {
        title: "Select memory and learning goals",
        body: "Pick priorities like memory enhancement, inspiration, or mental excellence."
      },
      {
        title: "Nightly reinforcement",
        body: "Audios play at bedtime and optionally again during sleep."
      },
      {
        title: "Stay consistent",
        body: "Members describe clearer recall and focus when they use the program steadily over weeks."
      }
    ],
    relatedSlugs: ["sleep-meditation", "stress-relief", "pain-relief"]
  }
];

export function getTopicLandingPage(slug: string): TopicLandingContent | undefined {
  return TOPIC_LANDING_PAGES.find((page) => page.slug === slug);
}

export function getRelatedTopicPages(slugs: TopicLandingSlug[]): TopicLandingContent[] {
  return slugs
    .map((slug) => getTopicLandingPage(slug))
    .filter((page): page is TopicLandingContent => page != null);
}

export const TOPIC_SIGNUP_HREF = SIGNUP;
