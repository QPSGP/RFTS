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
    slug: "weight-loss-hypnosis-guided-meditation-sleep",
    title: "Weight loss hypnosis and guided meditation while you sleep",
    metaTitle: "Weight Loss Hypnosis & Guided Meditation at Night | RFTS Blog",
    metaDescription:
      "How hypnosis and guided meditation support natural weight control — stress eating, sleep, and nightly goal audios. Adapted from Success Center, Inc. with transcript excerpt.",
    publishedAt: "2026-07-07",
    readMinutes: 6,
    excerpt:
      "Hypnosis for weight loss works through habit change at the subconscious level — especially when guided meditations repeat while you fall asleep and during sleep, not as another daytime chore.",
    goalSlug: "health",
    sections: [
      {
        paragraphs: [
          "People searching for weight loss hypnosis or guided meditation for natural weight control often already know diets alone are not enough. The missing piece is often habit — emotional eating, stress cravings, and the inner script that says healthy choices have to feel like punishment.",
          "Reach For The Stars treats health as one of your prioritized goals. When health and related themes are in your rotation, guided audios play automatically at bedtime and, if you choose two audios per night, again during sleep — the same receptive windows hypnotherapists have used for decades to support weight release and steady energy."
        ]
      },
      {
        heading: "Does hypnosis help with weight loss?",
        paragraphs: [
          "Research on hypnotherapy and weight loss has reported better outcomes when hypnosis is combined with behavioral change than diet alone in several studies — though results vary by person and program. Effective work is suggestion-based: you remain in control while your conscious and subconscious minds learn greater self-awareness and healthier responses.",
          "Hypnosis is a relaxed state that unlocks access to the subconscious — where hunger cues, cravings, and emotional patterns often live. Guided imagery and positive suggestion can make healthy eating and enjoyable movement feel rewarding rather than forced, which matters because most people only sustain what feels good over time."
        ]
      },
      {
        heading: "Stress eating and emotional eating",
        paragraphs: [
          "Stress releases cortisol, which can interfere with healthy weight loss. Many people reach for sugar or excess carbs when tension spikes — not from true hunger but from a learned calming response.",
          "Suggestions to meet stress with physical relaxation, emotional calm, and problem-solving behavior — instead of a box of snacks — are a core part of positive stress management. Pairing that with a health goal in your nightly rotation reinforces the same message when you are not willpower-depleted at 10 p.m."
        ]
      },
      {
        heading: "Weight loss while you sleep",
        paragraphs: [
          "Sleep quality and weight are linked: deep, restorative rest supports steady energy and better choices the next day. Guided meditations can suggest releasing weight during rejuvenating sleep and resolving challenges on the subconscious level overnight.",
          "Reach For The Stars schedules health-focused recordings in rotation over weeks — including the repeated exposure many practitioners associate with lasting mindset change — without requiring extra time in your busy day. Press Start Session at bedtime; your personalized audios handle the rest."
        ]
      },
      {
        heading: "A note on expectations",
        paragraphs: [
          "Guided meditation and hypnosis are mind-body tools that support habit change — not a substitute for medical advice, nutrition counseling, or treatment when you need professional care. If you have a health condition affecting weight, work with your clinician alongside any wellness practice.",
          "Members who see the best results tend to stay consistent for several weeks, choose health among their top goals, and treat nightly audios as one part of a whole approach to the body they want to delight in."
        ]
      },
      {
        heading: "Get started tonight",
        paragraphs: [
          "Choose health among your goals and complete registration to activate your membership. Order your priorities by importance — your personalized audios begin the first night you press Start Session.",
          "Explore our health goal page for how nightly rotation works, or use Start your journey below to sign up tonight."
        ]
      }
    ],
    transcriptExcerpt: {
      sessionTitle: "Healthy weight and vibrant energy (excerpt)",
      quote:
        "Healthy eating feels good to you now… you choose foods that nourish and satisfy… movement you enjoy becomes natural… your body releases what it no longer needs… steady energy carries you through the day…"
    }
  },
  {
    slug: "guided-meditation-memory-goal-mental-focus",
    title: "Memory as a nightly goal: guided meditation for focus and recall",
    metaTitle: "Memory Goal — Guided Meditation for Focus & Recall | RFTS Blog",
    metaDescription:
      "Choose memory among your Reach For The Stars goals and hear guided meditations for focus and recall at bedtime and during sleep. Transcript excerpt included.",
    publishedAt: "2026-06-27",
    readMinutes: 5,
    excerpt:
      "Memory and mental focus work best when they are goals you reinforce every night — not a random track you play once when you remember.",
    goalSlug: "memory",
    sections: [
      {
        paragraphs: [
          "People search for memory improvement meditation, brain training, and sharper focus — often while juggling too many apps and playlists. Reach For The Stars treats memory as one of up to ten prioritized goals. When memory is in your rotation, relevant guided audios play automatically while you fall asleep and, if you choose two audios per night, again during sleep.",
          "That matches how many members think about mental excellence: steady repetition at a receptive time, aligned with what you actually want to remember and focus on — not generic background audio."
        ]
      },
      {
        heading: "Why a memory goal beats a one-off session",
        paragraphs: [
          "A single calming recording can help one night. Lasting recall and attention usually come from consistent practice. Research on meditation links regular sessions to working memory and focus over weeks.",
          "With Reach For The Stars, you set memory among your goals, press Start Session at bedtime, and your schedule rotates priorities so memory themes return on a predictable cadence."
        ]
      },
      {
        heading: "Sleep, consolidation, and your second nightly audio",
        paragraphs: [
          "Sleep plays a central role in memory consolidation. The default program includes two audios per night: preparation and your first goal recording as you fall asleep, then optional reinforcement about 2.5 hours later while you are still in restorative sleep.",
          "Members often describe clearer recall and steadier focus when they stay consistent for several weeks — not from one perfect night."
        ]
      },
      {
        heading: "Get started tonight",
        paragraphs: [
          "Choose your goals and complete registration to activate your membership. Order memory and related priorities by importance — your personalized audios begin the first night you press Start Session.",
          "Read How It Works for the complete nightly flow, or use Start your journey below to sign up tonight."
        ]
      }
    ],
    transcriptExcerpt: {
      sessionTitle: "Memory and mental focus (excerpt)",
      quote:
        "Your mind is clear and ready to receive… what you choose to remember becomes easier to recall… focus sharpens with each calm breath… you trust your memory to serve you now and lifelong…"
    }
  },
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
    slug: "stress-relief-meditation-during-sleep",
    title: "Stress relief meditation while falling asleep and during sleep: calm your nervous system at night",
    metaTitle: "Stress Relief Meditation During Sleep | Reach For The Stars Blog",
    metaDescription:
      "Stress relief meditation and guided relaxation while going to sleep and during sleep. How nightly goal audios reduce anxiety and support emotional balance.",
    publishedAt: "2026-03-17",
    readMinutes: 5,
    excerpt:
      "While going to sleep and during sleep are ideal times for stress relief meditation — your body is winding down and guided audios meet you there instead of adding another daytime task.",
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
