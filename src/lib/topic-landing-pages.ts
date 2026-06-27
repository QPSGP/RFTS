export type TopicLandingSlug =
  | "sleep-meditation"
  | "stress-relief"
  | "pain-relief"
  | "memory-improvement"
  | "blood-pressure-regulation"
  | "resilience-meditation"
  | "emotional-health"
  | "will-power"
  | "self-awareness";

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
  },
  {
    slug: "blood-pressure-regulation",
    path: "/blood-pressure-regulation",
    pill: "Blood pressure",
    title: "Meditation for blood pressure regulation and cardiovascular calm",
    metaTitle: "Meditation for Blood Pressure Regulation | Reach For The Stars",
    metaDescription:
      "Support healthy blood pressure with guided meditation and nightly relaxation audios. Evidence-backed mind-body tools scheduled while you sleep.",
    heroLead:
      "Research links regular meditation to lower blood pressure and reduced cardiovascular stress. Reach For The Stars reinforces calm, relaxation, and health goals through personalized audios each night.",
    eyebrow: "Cardiovascular wellness",
    sectionTitle: "How guided meditation supports blood pressure",
    sectionSubtitle:
      "Relaxation practices can ease sympathetic nervous system arousal — a factor in elevated blood pressure for many people.",
    howItHelps: [
      {
        title: "Relaxation response",
        body:
          "Guided meditation activates the body’s relaxation response, which may help lower stress-related spikes in blood pressure over time."
      },
      {
        title: "Nightly consistency",
        body:
          "A fixed bedtime practice removes the friction of choosing what to listen to — consistency matters for cardiovascular benefits."
      },
      {
        title: "Holistic health goals",
        body:
          "Pair blood-pressure support with related health, sleep, and stress goals in your nightly rotation."
      }
    ],
    nightlySteps: [
      { title: "Select calm and health goals", body: "Prioritize rest, balance, and cardiovascular wellness among your goals." },
      { title: "Listen at bedtime", body: "Preparation and goal audios play as you fall asleep." },
      { title: "Track with your doctor", body: "Use meditation alongside medical care and regular checkups." }
    ],
    relatedSlugs: ["stress-relief", "sleep-meditation", "resilience-meditation"]
  },
  {
    slug: "resilience-meditation",
    path: "/resilience-meditation",
    pill: "Resilience",
    title: "Meditation for physical and psychological resilience",
    metaTitle: "Meditation for Physical & Psychological Resilience | Reach For The Stars",
    metaDescription:
      "Build resilience with guided meditation and nightly goal audios. Recover from stress, adapt to challenges, and strengthen mind-body balance while you sleep.",
    heroLead:
      "Physical and psychological resilience help you bounce back from life’s demands. Reach For The Stars reinforces resilience through repeated goal-based messages at bedtime and during sleep.",
    eyebrow: "Strength & recovery",
    sectionTitle: "Resilience through repetition and rest",
    sectionSubtitle:
      "Mindfulness research associates regular practice with better stress recovery and adaptive coping over time.",
    howItHelps: [
      {
        title: "Stress recovery",
        body:
          "Nightly guided audios support recovery after demanding days — especially for caregivers and high-stress workers."
      },
      {
        title: "Mind-body balance",
        body:
          "Resilience goals rotate with health, calm, and balance themes so reinforcement stays fresh."
      },
      {
        title: "Sleep as recovery",
        body:
          "Optional second audios during sleep reinforce resilience messages when the body restores."
      }
    ],
    nightlySteps: [
      { title: "Choose resilience goals", body: "Select balance, calm, and strength-related priorities." },
      { title: "Start Session nightly", body: "Your schedule plays automatically at bedtime." },
      { title: "Stay consistent", body: "Resilience builds over weeks of steady practice." }
    ],
    relatedSlugs: ["stress-relief", "emotional-health", "sleep-meditation"]
  },
  {
    slug: "emotional-health",
    path: "/emotional-health",
    pill: "Emotional health",
    title: "Meditation for improved emotional health and mood",
    metaTitle: "Meditation for Improved Emotional Health | Reach For The Stars",
    metaDescription:
      "Improve emotional health and mood with guided meditation and personalized nightly audios. Support regulation, optimism, and balance while you sleep.",
    heroLead:
      "Improved emotional health is one of the most cited benefits of meditation. Reach For The Stars delivers goal-aligned messages each night to reinforce mood, confidence, and emotional balance.",
    eyebrow: "Mood & regulation",
    sectionTitle: "Emotional health through guided practice",
    sectionSubtitle:
      "Studies link meditation to better mood, emotional regulation, and reduced symptoms of anxiety and depression when practiced consistently.",
    howItHelps: [
      {
        title: "Regulation skills",
        body:
          "Repeated guided messages train attention and emotional responses — skills members often use during the day."
      },
      {
        title: "Goal-aligned content",
        body:
          "Choose priorities like confidence, balance, and inspiration so audios match what you want to feel more of."
      },
      {
        title: "Bedtime window",
        body:
          "The transition into sleep is ideal for emotional reset without adding another daytime task."
      }
    ],
    nightlySteps: [
      { title: "Pick emotional health goals", body: "Prioritize calm, confidence, balance, or inspiration." },
      { title: "Nightly audios", body: "Preparation plus one or two goal recordings per night." },
      { title: "Notice shifts", body: "Emotional benefits often emerge over several weeks of use." }
    ],
    relatedSlugs: ["stress-relief", "self-awareness", "will-power"]
  },
  {
    slug: "will-power",
    path: "/will-power",
    pill: "Will power",
    title: "Meditation for enhanced will power and habit change",
    metaTitle: "Meditation for Enhanced Will Power & Habit Change | Reach For The Stars",
    metaDescription:
      "Strengthen will power and break bad habits with guided meditation and nightly goal audios. Reinforce discipline and follow-through while you sleep.",
    heroLead:
      "Enhanced will power supports habit change — from smoking cessation to healthier routines. Reach For The Stars reinforces discipline and intention through personalized audios scheduled each night.",
    eyebrow: "Discipline & habits",
    sectionTitle: "Will power through nightly reinforcement",
    sectionSubtitle:
      "Brain research suggests repeated intention and focus training can strengthen self-control pathways over time.",
    howItHelps: [
      {
        title: "Habit replacement",
        body:
          "Nightly goal messages support replacing unwanted habits with chosen priorities — aligned with balanced-life goals."
      },
      {
        title: "Pre-sleep priming",
        body:
          "Hearing intention-focused audios as you fall asleep primes the subconscious for next-day choices."
      },
      {
        title: "Structured rotation",
        body:
          "Goals rotate so will-power themes are reinforced regularly, not as one-off sessions."
      }
    ],
    nightlySteps: [
      { title: "Set discipline goals", body: "Choose habits and priorities you want to strengthen." },
      { title: "Press Start Session", body: "Audios play automatically each night at bedtime." },
      { title: "Build the streak", body: "Consistency is what turns intention into lasting change." }
    ],
    relatedSlugs: ["self-awareness", "emotional-health", "resilience-meditation"]
  },
  {
    slug: "self-awareness",
    path: "/self-awareness",
    pill: "Self-awareness",
    title: "Meditation for greater self-awareness and insight",
    metaTitle: "Meditation for Greater Self-Awareness | Reach For The Stars",
    metaDescription:
      "Develop greater self-awareness with guided meditation and nightly goal audios. Mindfulness, reflection, and personal insight while you sleep.",
    heroLead:
      "Greater self-awareness helps you understand patterns, triggers, and goals more clearly. Reach For The Stars supports introspection through guided meditation scheduled each night.",
    eyebrow: "Mindfulness & insight",
    sectionTitle: "Self-awareness through guided reflection",
    sectionSubtitle:
      "Meditation research associates regular practice with increased mindfulness and self-understanding over time.",
    howItHelps: [
      {
        title: "Mindful attention",
        body:
          "Guided audios train focused attention — a foundation for noticing thoughts and habits without judgment."
      },
      {
        title: "Personalized goals",
        body:
          "Self-awareness grows when messages align with your chosen priorities, not generic background tracks."
      },
      {
        title: "Quiet nightly space",
        body:
          "Bedtime offers a natural pause for reflection reinforced by structured guided content."
      }
    ],
    nightlySteps: [
      { title: "Choose insight goals", body: "Select inspiration, spirituality, or balance among your priorities." },
      { title: "Listen nightly", body: "Preparation and goal audios play as you wind down." },
      { title: "Reflect over time", body: "Members report clearer self-understanding after steady use." }
    ],
    relatedSlugs: ["emotional-health", "will-power", "memory-improvement"]
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
