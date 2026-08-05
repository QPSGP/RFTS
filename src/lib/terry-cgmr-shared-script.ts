/**
 * Shared Success Center / Terry Brussel-Rogers CGMR frame recovered from
 * classic SC CGMR library recordings (Weatherman, Weeks, Barrymore, Tart, …).
 *
 * These sections are nearly identical across personalized CGMRs; only the
 * member name / personalized middle suggestions change.
 */

/** Progressive relaxation + 5→0 deepener + nature vitality scene. */
export function buildTerryCgmrInductionAndDeepener(firstName: string): {
  induction: string[];
  deepener: string[];
} {
  const name = (firstName || "friend").trim() || "friend";
  const induction = [
    `${name}, this is your customized Goal Manifestation recording, crafted to enable you to accomplish your goals in business and in life.`,
    "Begin to relax your feet completely, just letting go and relaxing them. Ankles so relaxed.",
    "Relax the calves of your legs completely. Knees relaxing. Relax your thighs. Pelvic region letting go, relaxing.",
    "Relax your buttocks completely. Feel your stomach muscles relaxing, letting go. Relax your chest.",
    "Shoulders and arms relaxing completely. All tensions flowing out through your fingertips as your hands relax completely.",
    "Feel your back and spine letting go, relaxing. Your neck relaxing completely.",
    "Relax your facial muscles. Feel your scalp tingling with relaxation as you relax completely."
  ];

  const deepener = [
    "I am counting from five down to zero. When I reach the count of zero, you enter a deep hypnotic state.",
    "Five… four… three… two… one… zero.",
    "Relax completely. Relax completely.",
    "Imagine yourself resting on soft, soft grass beneath a tall, tall tree. The day is warm and serene. The sky very blue, the grass very green.",
    "There is a brook babbling in the background, a soft breeze blowing gently against your cheek. You are feeling so good, so relaxed.",
    "Imagine yourself walking through the beautiful forest. Feel the ground firm and cool beneath your feet.",
    "You are very much in touch with the vitality of the earth itself, very much aware of nature all around you and yourself a part of it.",
    "You are drawing energy, vitality and abundance easily and automatically from all the natural things around you."
  ];

  return { induction, deepener };
}

/**
 * Shared closing used on classic SC CGMRs: self-mastery awareness,
 * 0→5 emerge into natural sleep, nightly listening reinforcement.
 */
export function buildTerryCgmrClose(): string[] {
  return [
    "Relaxation being pumped throughout your entire being, through your heart. Feel it in your shoulders and arms, in your back and spine, feel it in your neck, glowing in your face, and in your mind as you become fully aware of your mind, your essence, your being - what makes you what you are. Be fully aware of yourself and explore your own being.",
    "With this self-awareness comes the knowledge that you are your own master. You can control your own mind, body and emotions. You can control your own life and fully express yourself in every way.",
    "This knowledge gives you a feeling of peace and relaxation, a deep sense of well-being and health.",
    "I will count from zero to five. When I reach the count of five, you emerge gently, fully from the state of hypnosis. You move into a deep, restful, natural sleep.",
    "Zero… one… two… three… four… five. Emerging now from the state of hypnosis, you move into a deep, restful, natural sleep.",
    "You listen to this recording many times. You enjoy and are committed to listening to your Reach For The Stars each night.",
    "Each time you listen to it, the suggestions become stronger, more powerful, more effective for you.",
    "You are doing everything in your power - physically, mentally, emotionally, spiritually, and financially - to make your goals, particularly the ones you have been listening to on this recording, a reality.",
    "Reach for the Stars."
  ];
}
