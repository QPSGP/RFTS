import type { GoalLandingSlug } from "@/lib/goal-landing-pages";
import type { TopicLandingSlug } from "@/lib/topic-landing-pages";

export type BlogPost = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  publishedAt: string;
  readMinutes: number;
  excerpt: string;
  /** Links to a wellness landing page when relevant */
  topicSlug?: TopicLandingSlug;
  /** Links to a goal landing page when relevant */
  goalSlug?: GoalLandingSlug;
  sections: { heading?: string; paragraphs: string[] }[];
  /** Short transcript-style excerpt from a guided session (SEO + authenticity) */
  transcriptExcerpt: {
    sessionTitle: string;
    quote: string;
  };
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "guided-sleep-meditation-better-sleep",
    title: "Guided sleep meditation: why nightly audios help you sleep better",
    metaTitle: "Guided Sleep Meditation for Better Sleep (Nightly Audios) | RFTS Blog",
    metaDescription:
      "Learn how guided sleep meditation at bedtime and during sleep supports rest. Transcript excerpt and how Reach For The Stars schedules personalized audios.",
    publishedAt: "2026-03-18",
    readMinutes: 5,
    excerpt:
      "Guided sleep meditation works best when it is consistent, personalized, and timed for the moments your mind is most receptive — especially as you fall asleep.",
    topicSlug: "sleep-meditation",
    sections: [
      {
        paragraphs: [
          "Many people search for guided sleep meditation because they want something simpler than another app full of random tracks. The challenge is not finding a single calming recording — it is building a habit that fits your goals and repeats every night without extra effort.",
          "Reach For The Stars schedules personalized audios while you fall asleep and, if you choose two audios per night, again during sleep. That structure mirrors what sleep research suggests: relaxation at bedtime plus reinforcement during the night."
        ]
      },
      {
        heading: "What to look for in a sleep meditation program",
        paragraphs: [
          "Choose content aligned with your priorities (rest, calm, balance), not generic background noise.",
          "Use a fixed nightly flow so you are not deciding what to play when you are already tired.",
          "Give the practice several weeks — sleep and suggestion both respond to repetition."
        ]
      }
    ],
    transcriptExcerpt: {
      sessionTitle: "Preparation for restful sleep (excerpt)",
      quote:
        "Allow your body to settle… with each breath, release the day… you are safe to rest now… your mind can follow your chosen intention for peaceful, restorative sleep…"
    }
  },
  {
    slug: "stress-relief-meditation-before-bed",
    title: "Stress relief meditation before bed: calm your nervous system at night",
    metaTitle: "Stress Relief Meditation Before Bed | Reach For The Stars Blog",
    metaDescription:
      "Stress relief meditation and guided relaxation at bedtime. How nightly goal audios reduce anxiety and support emotional balance while you sleep.",
    publishedAt: "2026-03-17",
    readMinutes: 5,
    excerpt:
      "Bedtime is one of the best times for stress relief meditation because your body is already winding down — guided audios meet you there instead of adding another daytime task.",
    topicSlug: "stress-relief",
    sections: [
      {
        paragraphs: [
          "Stress relief meditation searches often spike in the evening, when the mind replays the day. A short guided relaxation can interrupt that loop — especially when the messages match goals you care about, like calm, confidence, or balance.",
          "With Reach For The Stars, your stress-related goals rotate through a nightly schedule. You hear preparation, then goal audios, without opening a library or choosing tracks when you are exhausted."
        ]
      },
      {
        heading: "Why repetition matters for stress",
        paragraphs: [
          "Occasional meditation can feel good in the moment. Lasting stress relief usually comes from consistent practice that trains attention and emotional regulation over time.",
          "Members often report using techniques from their sessions during the day — a sign that nightly reinforcement is encoding new patterns, not just helping one night at a time."
        ]
      }
    ],
    transcriptExcerpt: {
      sessionTitle: "Release tension and restore calm (excerpt)",
      quote:
        "Notice where you hold stress in your body… let shoulders soften… breathe in calm… breathe out what you no longer need… you choose peace in this moment…"
    }
  },
  {
    slug: "pain-relief-meditation-natural-comfort",
    title: "Pain relief meditation: mind-body support for natural comfort",
    metaTitle: "Pain Relief Meditation & Natural Comfort at Night | RFTS Blog",
    metaDescription:
      "Pain relief meditation and guided relaxation for tension and chronic discomfort. Transcript excerpt and personalized nightly audios — alongside medical care.",
    publishedAt: "2026-03-16",
    readMinutes: 6,
    excerpt:
      "Pain relief meditation is not a replacement for medical care — it is a mind-body tool many people use alongside treatment to ease tension and improve sleep when pain keeps them awake.",
    topicSlug: "pain-relief",
    sections: [
      {
        paragraphs: [
          "People look for natural pain relief when medication alone is not enough, or when they want relaxation skills they can use every night. Guided meditation can reduce muscle tension and stress that amplifies pain perception.",
          "Reach For The Stars members can work with facilitators on personalized recordings (CGMR) in addition to goal-based library audios — so messages can align with their situation while still following a nightly schedule."
        ]
      },
      {
        heading: "Sleep and pain are connected",
        paragraphs: [
          "Poor sleep often worsens pain; pain often disrupts sleep. A program that addresses both rest and comfort goals in one membership can support the whole cycle.",
          "Consistency matters more than any single session. Nightly audios build a routine your nervous system learns to associate with safety and release."
        ]
      }
    ],
    transcriptExcerpt: {
      sessionTitle: "Comfort and natural pain relief (excerpt)",
      quote:
        "Send relaxation to areas that ask for attention… warmth and ease can spread with each breath… you are supported in comfort now… healing happens in rest…"
    }
  },
  {
    slug: "memory-improvement-meditation-sleep",
    title: "Memory improvement meditation: focus and recall while you sleep",
    metaTitle: "Memory Improvement Meditation While You Sleep | RFTS Blog",
    metaDescription:
      "Memory improvement meditation and brain training through nightly goal audios. How sleep, repetition, and focus goals work together.",
    publishedAt: "2026-03-15",
    readMinutes: 5,
    excerpt:
      "Memory improvement meditation searches often pair with questions about focus and brain training. Sleep plays a central role in consolidation — reinforcing learning messages at night can support both.",
    topicSlug: "memory-improvement",
    sections: [
      {
        paragraphs: [
          "Research on meditation links regular practice to attention, working memory, and structural brain changes over weeks — not from a single session. Reach For The Stars applies that principle with goal-based audios scheduled every night.",
          "When memory and mental excellence are among your chosen goals, your rotation includes relevant guided content automatically — no separate playlist to maintain."
        ]
      },
      {
        heading: "Two audios, one night",
        paragraphs: [
          "The default is two audios per night: one as you fall asleep, another about 2.5 hours later. That second play reinforces goals during sleep — the same window many people associate with deep learning and integration.",
          "Members describe clearer recall and focus when they stay consistent over weeks, not days."
        ]
      }
    ],
    transcriptExcerpt: {
      sessionTitle: "Mental clarity and memory enhancement (excerpt)",
      quote:
        "Your mind is clear and receptive… information you choose to retain becomes easier to recall… focus grows with each calm breath… you trust your memory…"
    }
  },
  {
    slug: "burnout-recovery-guided-audios",
    title: "Burnout recovery: guided audios for caregivers and high-stress work",
    metaTitle: "Burnout Recovery & Guided Audios for Caregivers | RFTS Blog",
    metaDescription:
      "Burnout recovery with guided relaxation at night. For caregivers, healthcare workers, and anyone running on empty — nightly audios without another daytime chore.",
    publishedAt: "2026-03-14",
    readMinutes: 5,
    excerpt:
      "Burnout recovery needs rest you can actually keep. Nightly guided audios fit caregivers and high-stress workers who cannot add another daytime wellness task.",
    topicSlug: "stress-relief",
    sections: [
      {
        paragraphs: [
          "Burnout shows up as exhaustion, irritability, and trouble sleeping — often in caregivers, healthcare workers, and parents. Recovery requires sustainable habits, not heroic one-off self-care.",
          "Reach For The Stars runs while you sleep: press Start Session at bedtime and your personalized audios handle the rest. That lowers the friction that stops many burnout recovery plans cold."
        ]
      },
      {
        heading: "Start with calm and sleep goals",
        paragraphs: [
          "If you are depleted, begin with rest, balance, and stress relief goals before adding ambitious performance targets.",
          "Pair the program with real boundaries and support where you can — audios reinforce intention; they do not replace time off or professional help when needed."
        ]
      }
    ],
    transcriptExcerpt: {
      sessionTitle: "Restore balance after a demanding day (excerpt)",
      quote:
        "You have given enough for today… permission to rest is yours… balance returns when you allow recovery… tomorrow can wait until you are restored…"
    }
  },
  {
    slug: "two-audios-per-night-why-it-works",
    title: "Why two audios per night reinforce your goals while you sleep",
    metaTitle: "Two Audios Per Night: How Nightly Reinforcement Works | RFTS Blog",
    metaDescription:
      "Why Reach For The Stars plays two personalized audios per night — preparation, first goal, and a second session during sleep for deeper reinforcement.",
    publishedAt: "2026-03-13",
    readMinutes: 4,
    excerpt:
      "One audio helps you fall asleep with intention. A second audio, about 2.5 hours later, reinforces the same goals during sleep — that is the Reach For The Stars nightly design.",
    sections: [
      {
        paragraphs: [
          "Members can choose one or two audios per night; the default is two. The first session includes preparation and your first goal recording as you fall asleep — a high-suggestibility window for guided meditation.",
          "The second play targets the same goals during sleep, when the brain is still processing and consolidating. It is the same logic behind spaced repetition, applied to your wellness priorities."
        ]
      },
      {
        heading: "How to get started",
        paragraphs: [
          "Select up to ten goals and order them by importance. Register, press Start Session at bedtime, and let the schedule rotate your goals over time.",
          "Read How It Works for the full nightly flow, or explore our wellness topic pages for sleep, stress, pain relief, and memory."
        ]
      }
    ],
    transcriptExcerpt: {
      sessionTitle: "Second session reinforcement (excerpt)",
      quote:
        "Your chosen goals continue to integrate… deep rest supports lasting change… you absorb what serves you… each night builds on the last…"
    }
  }
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getBlogPostsNewestFirst(): BlogPost[] {
  return BLOG_POSTS.slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
