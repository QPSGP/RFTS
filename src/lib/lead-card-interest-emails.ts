/**
 * Conversion emails matched to paper / digital lead-card goal checkboxes
 * (`EVENT_LEAD_CARD_GOALS`). Send the matching template when a lead checked
 * that box. Use the menu email when they checked many.
 */
import { EVENT_LEAD_CARD_GOALS } from "@/lib/event-leads";

type ConversionEmailTemplate = {
  name: string;
  subject: string;
  bodyText: string;
  purpose: string;
};

const TRIAL_CLOSE = `Start your 14-day free trial tonight:
{{siteUrl}}/signup/step-1-subscription-selection

Questions? Call (800) GOAL NOW (462-5669)

Warmly,
{{yourName}}
Reach For The Stars`;

function convertEmail(
  name: string,
  purpose: string,
  subject: string,
  body: string
): ConversionEmailTemplate {
  return {
    name,
    purpose,
    subject,
    bodyText: `${body.trim()}\n\n${TRIAL_CLOSE}`
  };
}

export type LeadCardInterestLabel = (typeof EVENT_LEAD_CARD_GOALS)[number];

type LeadCardInterestSpec = {
  label: LeadCardInterestLabel;
  subject: string;
  path: string;
  related?: { label: string; path: string }[];
  paragraphs: [string, string] | [string, string, string];
};

function purposeFromLabel(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\$/g, " money")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `convert_lead_${slug}`;
}

export function leadCardInterestTemplateName(label: string): string {
  return `Convert lead card - ${label}`;
}

function relatedBlock(related?: { label: string; path: string }[]): string {
  if (!related?.length) return "";
  const lines = related.map((r) => `${r.label}: {{siteUrl}}${r.path}`);
  return `\n\nRelated: ${lines.join(", ")}`;
}

function fromSpec(spec: LeadCardInterestSpec): ConversionEmailTemplate {
  const body = `Hello {{firstName}},

You marked ${spec.label} on your lead card. Reach For The Stars can put that in your nightly rotation - guided audios while you fall asleep and during sleep, without another daytime chore.

${spec.paragraphs.join("\n\n")}

Read more:
{{siteUrl}}${spec.path}${relatedBlock(spec.related)}`;

  return convertEmail(
    leadCardInterestTemplateName(spec.label),
    purposeFromLabel(spec.label),
    spec.subject,
    body
  );
}

/** One spec per EVENT_LEAD_CARD_GOALS checkbox, in card order. */
export const LEAD_CARD_INTEREST_SPECS: LeadCardInterestSpec[] = [
  {
    label: "Anger Management",
    subject: "{{firstName}}, steadier responses when the day catches up",
    path: "/emotional-health",
    related: [
      { label: "Stress relief", path: "/stress-relief" },
      { label: "Self-awareness", path: "/self-awareness" }
    ],
    paragraphs: [
      "Anger often spikes when you are depleted - traffic, family, work, unfinished lists. Nightly emotional-health audios rehearse a calmer baseline so the next trigger does not run the whole evening.",
      "This is support for mood and reaction patterns, not a substitute for therapy or medical care. Rank anger-related goals with stress relief if both showed up on your card."
    ]
  },
  {
    label: "Attract Love",
    subject: "{{firstName}}, become the match you want - at bedtime",
    path: "/relationship",
    related: [{ label: "Emotional health", path: "/emotional-health" }],
    paragraphs: [
      "Attracting love is less a hunt and more how you show up: warmth, confidence, and readiness without desperation. Relationship audios reinforce those qualities while you sleep.",
      "A calmer nervous system also helps. Pair this with emotional health or self-awareness if dating fatigue is part of the story."
    ]
  },
  {
    label: "Coaching",
    subject: "{{firstName}}, coaching that does not steal another hour",
    path: "/inspiration",
    related: [
      { label: "Affiliates", path: "/affiliates" },
      { label: "Balanced Life", path: "/balanced-life" }
    ],
    paragraphs: [
      "If you want coaching for yourself, nightly guided practice is the follow-through between sessions: goals ranked, then reinforced while you sleep.",
      "If you are the coach, your clients can press Start at bedtime and you can refer with 25% ongoing. Either path starts with the same membership trial."
    ]
  },
  {
    label: "Confidence",
    subject: "{{firstName}}, quiet confidence trained overnight",
    path: "/will-power",
    related: [{ label: "Emotional health", path: "/emotional-health" }],
    paragraphs: [
      "Confidence is a practiced state, not a speech you give yourself in the parking lot. Will-power and emotional-health audios rehearse follow-through, self-trust, and a steadier inner voice at bedtime.",
      "Rank confidence with speaking, sales, or relationship goals if those are how you want it to show up in the day."
    ]
  },
  {
    label: "Creativity",
    subject: "{{firstName}}, inspiration on a nightly schedule",
    path: "/inspiration",
    paragraphs: [
      "Creative work stalls when the day is all delivery and no recovery. Inspiration-focused audios keep ideas and openness in rotation while you sleep - so flow is not competing with another course.",
      "Pair creativity with wealth or spirituality if that is your mix. Reorder anytime; the lineup updates when you press Start Session."
    ]
  },
  {
    label: "End Pain",
    subject: "{{firstName}}, comfort and sleep as a nightly habit",
    path: "/pain-relief",
    related: [{ label: "Health", path: "/health" }],
    paragraphs: [
      "Guided relaxation can ease muscle tension and the stress that amplifies pain - especially at bedtime. Better sleep also supports recovery.",
      "Use this alongside medical care, not instead of it. Facilitators can add a personalized recording when you need extra customization."
    ]
  },
  {
    label: "End Procrastination",
    subject: "{{firstName}}, follow-through that starts tonight",
    path: "/will-power",
    related: [{ label: "Inspiration", path: "/inspiration" }],
    paragraphs: [
      "Procrastination is often empty willpower by evening, not a character flaw. Nightly resolve audios rehearse starting, finishing, and recovering after a slip - when the day already used your grit.",
      "Rank this with time management or motivation if those were on your card too. Consistency beats one heroic Monday."
    ]
  },
  {
    label: "Energy",
    subject: "{{firstName}}, vitality that is not another morning stack",
    path: "/health",
    related: [{ label: "Sleep", path: "/sleep-meditation" }],
    paragraphs: [
      "Energy returns when rest, recovery, and kinder body habits get repeated. Health-focused audios at bedtime support vitality without adding a 5 a.m. wellness protocol you will skip on hard weeks.",
      "If sleep is part of the drain, put Sleep Well in the same rotation. Two audios per night is the default for deeper reinforcement."
    ]
  },
  {
    label: "Explore Past Lives",
    subject: "{{firstName}}, inner exploration that fits bedtime",
    path: "/spirituality",
    paragraphs: [
      "Curiosity about past lives is part of a wider inner life - meaning, continuity, and a greater spiritual connection. Spirituality audios give that exploration a consistent nightly window.",
      "You choose the goals. The schedule adapts when you update them. No extra daytime ritual required."
    ]
  },
  {
    label: "Health & Rejuvenation",
    subject: "{{firstName}}, health and rejuvenation while you rest",
    path: "/health",
    related: [
      { label: "Sleep", path: "/sleep-meditation" },
      { label: "Pain relief", path: "/pain-relief" }
    ],
    paragraphs: [
      "Health and rejuvenation are more than one cleanse or one gym streak. Nightly health audios reinforce longevity, recovery, and a body you want to delight in - when the mind is most receptive.",
      "Pair with sleep, pain comfort, or energy if those were on your card. Stay with it for weeks, not one inspired evening."
    ]
  },
  {
    label: "Life Mission",
    subject: "{{firstName}}, a clearer mission - rehearsed at night",
    path: "/inspiration",
    related: [
      { label: "Spirituality", path: "/spirituality" },
      { label: "Balanced Life", path: "/balanced-life" }
    ],
    paragraphs: [
      "Life mission work fails when it is only a journal you never open. Inspiration and spirituality audios keep purpose, contribution, and direction in nightly rotation.",
      "Balanced Life is the whole-life frame if you also marked health, wealth, or relationship. Rank what matters most; we rotate the rest."
    ]
  },
  {
    label: "Marketing",
    subject: "{{firstName}}, marketing follow-through after the booth",
    path: "/wealth",
    related: [
      { label: "Inspiration", path: "/inspiration" },
      { label: "Affiliates", path: "/affiliates" }
    ],
    paragraphs: [
      "Marketing is offers, outreach, and the inner permission to be visible. Wealth and inspiration audios support that mix - asking, following up, and staying creative - while you sleep.",
      "If you market a healing or coaching practice, you can also refer members and earn 25% ongoing. Start with your own trial so you know what you are sharing."
    ]
  },
  {
    label: "Memory Excellence",
    subject: "{{firstName}}, memory and focus while you sleep",
    path: "/memory",
    related: [{ label: "Memory improvement", path: "/memory-improvement" }],
    paragraphs: [
      "Sleep supports memory consolidation. Reach For The Stars reinforces learning, recall, and mental clarity with goal-based audios each night - no playlist to maintain.",
      "Useful for work, study, and staying sharp. Rank memory with sleep if nights have been short."
    ]
  },
  {
    label: "Motivation",
    subject: "{{firstName}}, motivation that is not a morning pep talk",
    path: "/will-power",
    related: [{ label: "Inspiration", path: "/inspiration" }],
    paragraphs: [
      "Motivation fades by 9 p.m. when the day already spent it. Nightly will-power and inspiration audios rehearse drive and follow-through in the window you already have: bedtime.",
      "Pair with end-procrastination or raise-income if those were on your card. Press Start Session. Let tonight do the work."
    ]
  },
  {
    label: "Psychic Abilities",
    subject: "{{firstName}}, inner perception as a nightly practice",
    path: "/spirituality",
    related: [{ label: "Self-awareness", path: "/self-awareness" }],
    paragraphs: [
      "Psychic and intuitive development sits with spirituality: presence, inner listening, and a greater connection. Guided audios at bedtime give that practice a consistent cue.",
      "Self-awareness themes pair well if you also want clearer seeing of patterns in daily life."
    ]
  },
  {
    label: "Quit Smoking",
    subject: "{{firstName}}, habit change that primes the next day",
    path: "/overcoming-addiction",
    related: [{ label: "Will power", path: "/will-power" }],
    paragraphs: [
      "Quitting smoking is easier when tomorrow's choices are primed the night before. Supportive messages at bedtime and during sleep help replace automatic patterns with calm and control.",
      "This complements medical care and quit programs - it does not replace them. Rank with will power if follow-through is the hard part."
    ]
  },
  {
    label: "Raise Income",
    subject: "{{firstName}}, income goals trained at night, not another hustle playlist",
    path: "/wealth",
    related: [{ label: "Will power", path: "/will-power" }],
    paragraphs: [
      "Raising income needs actions and a nervous system that can ask, follow up, and recover after a no. Wealth-focused audios reinforce worth, follow-through, and financial calm while you sleep.",
      "If you also marked sales, marketing, or retirement, put those in the same rotation. Update priorities anytime."
    ]
  },
  {
    label: "Relationship Joy",
    subject: "{{firstName}}, connection that does not need another dating course",
    path: "/relationship",
    related: [{ label: "Emotional health", path: "/emotional-health" }],
    paragraphs: [
      "Relationship joy is patience, warmth, and how you show up - in a new match or a present partnership. Nightly relationship audios reinforce those qualities as you fall asleep.",
      "Bedtime relaxation also lowers reactivity. A calmer nervous system is a better foundation for love."
    ]
  },
  {
    label: "Retirement $",
    subject: "{{firstName}}, retirement money with a calmer overnight mind",
    path: "/wealth",
    paragraphs: [
      "Retirement money is practical and psychological: saving, earning, and not letting money worry steal sleep. Wealth audios keep abundance and steady follow-through in nightly rotation.",
      "Pair with travel or health if those are how you want the next chapter to feel. Rank them. Press Start Session."
    ]
  },
  {
    label: "Sales Skills",
    subject: "{{firstName}}, quota calm that trains after the last call",
    path: "/wealth",
    related: [
      { label: "Inspiration", path: "/inspiration" },
      { label: "Will power", path: "/will-power" }
    ],
    paragraphs: [
      "Sales skills are craft plus composure. Nightly wealth and will-power audios support asking, following up, and bouncing back after rejection - without another daytime podcast.",
      "If you lead a team, partners earn 25% ongoing on referred memberships. Your own trial is the shortest demo."
    ]
  },
  {
    label: "Sleep Well",
    subject: "{{firstName}}, guided sleep that actually has a schedule",
    path: "/sleep-meditation",
    related: [{ label: "Stress relief", path: "/stress-relief" }],
    paragraphs: [
      "If you checked Sleep Well, this is the low-friction version: intro relaxation music, then your first goal recording as you wind down. Optional second audio during restorative sleep.",
      "Your schedule rotates rest, calm, and related goals so it stays fresh - not one track on repeat."
    ]
  },
  {
    label: "Speaking Skills",
    subject: "{{firstName}}, presence before the next time you speak",
    path: "/inspiration",
    related: [{ label: "Will power", path: "/will-power" }],
    paragraphs: [
      "Speaking skills are voice, structure, and nerves. Inspiration and will-power audios rehearse confidence and presence at bedtime so the next meeting, class, or stage is not running on leftover adrenaline.",
      "Rank with confidence or sales if those were on your card. Two audios per night is the default."
    ]
  },
  {
    label: "Spiritual Growth",
    subject: "{{firstName}}, a sacred routine that happens at bedtime",
    path: "/spirituality",
    paragraphs: [
      "Spiritual growth does not have to be one more daytime appointment. Bedtime becomes a consistent practice: peace, presence, and inner alignment, reinforced as you fall asleep and during sleep.",
      "You choose goals that match your path. The schedule adapts when you update them."
    ]
  },
  {
    label: "Stop Smoking",
    subject: "{{firstName}}, stop smoking with nightly reinforcement",
    path: "/overcoming-addiction",
    related: [{ label: "Will power", path: "/will-power" }],
    paragraphs: [
      "Stopping smoking is a next-day decision, repeated. Nightly audios help prime calm, control, and a different automatic response when the old cue shows up.",
      "Use this with medical support and a quit plan you trust. Rank will power beside it if slips have been the pattern."
    ]
  },
  {
    label: "Stress Management",
    subject: "{{firstName}}, calm at the one window you already have",
    path: "/stress-relief",
    related: [
      { label: "Sleep", path: "/sleep-meditation" },
      { label: "Resilience", path: "/resilience-meditation" }
    ],
    paragraphs: [
      "The transition into sleep is a natural window for relaxation. Stress-management meditation at night reinforces calm without adding a daytime task you will skip when you are already overloaded.",
      "Members often use techniques from sessions to settle themselves during the day. Pair with sleep or resilience if those were checked too."
    ]
  },
  {
    label: "Time Management",
    subject: "{{firstName}}, priorities that stick after the day is done",
    path: "/will-power",
    related: [{ label: "Balanced Life", path: "/balanced-life" }],
    paragraphs: [
      "Time management fails when every hour is already claimed. Nightly will-power audios rehearse choosing the aligned next step and finishing what matters - so tomorrow is not the same scramble.",
      "Balanced Life is the frame if you also marked health, wealth, and spirit. Rank up to ten. We rotate them."
    ]
  },
  {
    label: "Travel $",
    subject: "{{firstName}}, travel money as a nightly wealth goal",
    path: "/wealth",
    paragraphs: [
      "Travel money is a specific wealth goal: earning, saving, and believing the trip is allowed. Abundance audios keep that picture in rotation while you sleep - not as another vision-board homework pile.",
      "Pair with raise income or retirement if those were on your card. Update the list when the trip is booked and a new goal takes its place."
    ]
  },
  {
    label: "Vision",
    subject: "{{firstName}}, a clearer picture of the life you are building",
    path: "/inspiration",
    related: [
      { label: "Spirituality", path: "/spirituality" },
      { label: "Health", path: "/health" }
    ],
    paragraphs: [
      "Vision on a lead card often means the life you want to see clearly - direction, purpose, and follow-through. Inspiration and spirituality audios keep that picture in nightly rotation.",
      "If you meant physical eyesight or body comfort, put Health in the same lineup and mention it to your facilitator. Either way, Start Session is the nightly cue."
    ]
  },
  {
    label: "Weight Control",
    subject: "{{firstName}}, kinder habits primed before tomorrow's choices",
    path: "/overcoming-addiction",
    related: [
      { label: "Health", path: "/health" },
      { label: "Will power", path: "/will-power" }
    ],
    paragraphs: [
      "Weight control is food, movement, and the evening decisions that undo the day. Nightly audios support balanced living and follow-through - a complement to medical and nutrition care, not a replacement.",
      "Rank health and will power beside it. Repetition over weeks matters more than one strict Monday."
    ]
  }
];

export const MEMBER_CONVERT_LEAD_CARD_INTEREST_EMAILS: ConversionEmailTemplate[] =
  LEAD_CARD_INTEREST_SPECS.map(fromSpec);

const LEAD_CARD_MENU_LINKS = LEAD_CARD_INTEREST_SPECS.map(
  (spec) => `${spec.label}: {{siteUrl}}${spec.path}`
).join("\n");

/** Use when a lead checked many lead-card boxes. */
export const MEMBER_CONVERT_LEAD_CARD_MENU_EMAIL: ConversionEmailTemplate =
  convertEmail(
    "Convert menu - Lead card interests",
    "convert_lead_card_menu",
    "{{firstName}}, the goals you checked, one nightly practice",
    `Hello {{firstName}},

You checked more than one interest on the lead card. You do not have to pick a single lane. Reach For The Stars lets you rank up to ten priorities. We rotate guided audios so they all get airtime - while you sleep.

Here are the pages that match the checkboxes on the card:

${LEAD_CARD_MENU_LINKS}

Start here if you want the whole-life frame:
{{siteUrl}}/landing/best-you

How it works: {{siteUrl}}/how-it-works

Open the pages that match what you marked. Then start the trial and let tonight's session do the work.`
  );

export const MEMBER_LEAD_CARD_CONVERSION_EMAILS: ConversionEmailTemplate[] = [
  MEMBER_CONVERT_LEAD_CARD_MENU_EMAIL,
  ...MEMBER_CONVERT_LEAD_CARD_INTEREST_EMAILS
];

type MissingLeadCardInterest = Exclude<
  LeadCardInterestLabel,
  (typeof LEAD_CARD_INTEREST_SPECS)[number]["label"]
>;
type AssertNoMissingLeadCardInterest<T extends never> = T;
export type LeadCardInterestEmailCoverage =
  AssertNoMissingLeadCardInterest<MissingLeadCardInterest>;

export function getLeadCardInterestEmail(
  label: string
): ConversionEmailTemplate | undefined {
  const expected = leadCardInterestTemplateName(label).toLowerCase();
  return MEMBER_CONVERT_LEAD_CARD_INTEREST_EMAILS.find(
    (t) => t.name.toLowerCase() === expected
  );
}
