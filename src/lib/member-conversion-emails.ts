/**
 * Member-conversion email samples for CRM / Resend.
 * Covers every goal, wellness, campaign landing, and lead-card checkbox.
 * Placeholders: {{firstName}}, {{siteUrl}}, {{yourName}}
 */
import { MEMBER_LEAD_CARD_CONVERSION_EMAILS } from "@/lib/lead-card-interest-emails";

export type ConversionEmailTemplate = {
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

/** 5-email nurture sequence. Send 1-2 days apart. Together they cover every landing. */
export const MEMBER_CONVERT_NURTURE_EMAILS: ConversionEmailTemplate[] = [
  convertEmail(
    "Convert nurture 1 - Imagine the best you",
    "convert_nurture_1",
    "{{firstName}}, imagine the best you - then train for it while you sleep",
    `Hello {{firstName}},

Imagine the best you. Then give that version a nightly practice.

Reach For The Stars turns the goals you care about into guided meditations that play while you fall asleep and during sleep. You pick up to ten priorities. We rotate them so your subconscious hears the right messages without another daytime chore.

See the conversion page:
{{siteUrl}}/landing/best-you

Press Start Session at bedtime. Intro relaxation music, then your first goal recording. Optional second audio about 2.5 hours later, during restorative sleep.

Gold membership includes a 14-day free trial, then $19.95 per month.`
  ),
  convertEmail(
    "Convert nurture 2 - Your goals, nightly",
    "convert_nurture_2",
    "{{firstName}}, which of these is calling you?",
    `Hello {{firstName}},

Membership is built around the goals you actually want. Open the page that matches you - or send this list to yourself and pick two or three to start.

Health - healthy longevity, energy, a body to delight in
{{siteUrl}}/health

Wealth - financial abundance
{{siteUrl}}/wealth

Relationship - a joyful new or deeper present relationship
{{siteUrl}}/relationship

Memory - the focus you want now and lifelong
{{siteUrl}}/memory

Inspiration - creativity and entrepreneurial drive on demand
{{siteUrl}}/inspiration

Spirituality - a greater inner connection
{{siteUrl}}/spirituality

Overcoming Addiction - freedom from smoking, overeating, and unwanted habits
{{siteUrl}}/overcoming-addiction

Balanced Life - highest potential physically, mentally, emotionally, spiritually, and financially
{{siteUrl}}/balanced-life

You can reorder priorities anytime. Your nightly lineup updates when you press Start Session.`
  ),
  convertEmail(
    "Convert nurture 3 - Sleep, stress, and recovery",
    "convert_nurture_3",
    "{{firstName}}, recovery that does not steal from your day",
    `Hello {{firstName}},

Hard days need recovery - not another self-care chore. These wellness pages match what people search for when they are tired, tense, or burned out.

Better sleep
{{siteUrl}}/sleep-meditation

Stress relief
{{siteUrl}}/stress-relief

Burnout recovery
{{siteUrl}}/burnout-recovery

Pain relief
{{siteUrl}}/pain-relief

Memory and focus
{{siteUrl}}/memory-improvement

Blood pressure regulation
{{siteUrl}}/blood-pressure-regulation

Physical and psychological resilience
{{siteUrl}}/resilience-meditation

Emotional health
{{siteUrl}}/emotional-health

Will power and habit change
{{siteUrl}}/will-power

Self-awareness
{{siteUrl}}/self-awareness

Choose the ones that fit. Your schedule mixes them with your goal list so support stays fresh over weeks.`
  ),
  convertEmail(
    "Convert nurture 4 - How nights work",
    "convert_nurture_4",
    "{{firstName}}, how a night actually works (and why it sticks)",
    `Hello {{firstName}},

Here is the whole method in one sitting.

How it works - press Start Session at bedtime. Intro relaxation music, then your first goal recording as you drift off. Optional second recording during sleep.
{{siteUrl}}/how-it-works

The science - regular meditation is linked with lower stress, better sleep, focus, mood, and pain coping. We put that practice in the window when you are already in bed.
{{siteUrl}}/science

FAQs - trial, membership, listening with a headset, and what happens after signup.
{{siteUrl}}/faqs

Repetition is the key. Two audios per night is the default for deeper reinforcement. Stay with it for weeks, not one inspired evening.`
  ),
  convertEmail(
    "Convert nurture 5 - Practice, not paper",
    "convert_nurture_5",
    "{{firstName}}, paper does not bind reality. Practice does.",
    `Hello {{firstName}},

If a "contract with the universe" were already working, you would feel it in your habits, sleep, and follow-through.

Manifestation agreements sound powerful. Practice is what actually moves the needle: clear goals, ordered by priority, repeated while you fall asleep.

Read the challenge:
{{siteUrl}}/landing/contracts

Then come back to the best-you page and start the 14-night test:
{{siteUrl}}/landing/best-you

Gold: 14-day free trial, then $19.95/month. Platinum Managed: 30-day trial with facilitator support if you want a guided enrollment.

Tonight is enough. Pick your goals. Press Start Session.`
  )
];

/** One email that lists every interest landing - use when the lead checked many boxes. */
export const MEMBER_CONVERT_ALL_INTERESTS_EMAIL: ConversionEmailTemplate = convertEmail(
  "Convert menu - All interests",
  "convert_all_interests",
  "{{firstName}}, your interests, one membership, nightly practice",
  `Hello {{firstName}},

You do not have to pick one area of life and ignore the rest. Reach For The Stars lets you rank up to ten priorities. We rotate guided audios so health, wealth, relationships, and recovery can all get airtime - while you sleep.

Start here:
{{siteUrl}}/landing/best-you

Goal pages
- Health: {{siteUrl}}/health
- Wealth: {{siteUrl}}/wealth
- Relationship: {{siteUrl}}/relationship
- Memory: {{siteUrl}}/memory
- Inspiration: {{siteUrl}}/inspiration
- Spirituality: {{siteUrl}}/spirituality
- Overcoming Addiction: {{siteUrl}}/overcoming-addiction
- Balanced Life: {{siteUrl}}/balanced-life

Wellness pages
- Sleep: {{siteUrl}}/sleep-meditation
- Stress relief: {{siteUrl}}/stress-relief
- Burnout recovery: {{siteUrl}}/burnout-recovery
- Pain relief: {{siteUrl}}/pain-relief
- Memory and focus: {{siteUrl}}/memory-improvement
- Blood pressure: {{siteUrl}}/blood-pressure-regulation
- Resilience: {{siteUrl}}/resilience-meditation
- Emotional health: {{siteUrl}}/emotional-health
- Will power: {{siteUrl}}/will-power
- Self-awareness: {{siteUrl}}/self-awareness

How it works: {{siteUrl}}/how-it-works
The science: {{siteUrl}}/science
FAQs: {{siteUrl}}/faqs
Tired of fictional contracts? {{siteUrl}}/landing/contracts

Open the pages that match you. Then start the trial and let tonight's session do the work.`
);

/** One targeted email per unique landing interest. */
export const MEMBER_CONVERT_INTEREST_EMAILS: ConversionEmailTemplate[] = [
  convertEmail(
    "Convert interest - Health",
    "convert_health",
    "{{firstName}}, health goals that work while you rest",
    `Hello {{firstName}},

Health is more than one workout or one supplement. It is the body you want to delight in - energy, recovery, comfort, and healthy longevity - reinforced when the mind is most receptive.

Reach For The Stars rotates health-focused guided meditations at bedtime and during sleep. Pair them with rest, resilience, or pain-comfort goals if those matter too.

Read the health page:
{{siteUrl}}/health`
  ),
  convertEmail(
    "Convert interest - Wealth",
    "convert_wealth",
    "{{firstName}}, abundance mindset - trained at night, not another podcast",
    `Hello {{firstName}},

Financial abundance starts with consistent mindset work. Wealth-focused guided meditations play in rotation so prosperity messages reach your subconscious nightly - confidence, follow-through, and the inner dialogue that matches the life you are building.

Change your priorities anytime. New recordings enter your schedule from the list you set.

Read the wealth page:
{{siteUrl}}/wealth`
  ),
  convertEmail(
    "Convert interest - Relationship",
    "convert_relationship",
    "{{firstName}}, connection that does not need another dating course",
    `Hello {{firstName}},

Whether you want a joyful new relationship or a deeper present one, nightly relationship audios reinforce patience, warmth, and confidence - the qualities that support how you show up with others.

Bedtime relaxation also lowers reactivity. A calmer nervous system is a better foundation for love.

Read the relationship page:
{{siteUrl}}/relationship

Related support: emotional health {{siteUrl}}/emotional-health, self-awareness {{siteUrl}}/self-awareness, sleep {{siteUrl}}/sleep-meditation`
  ),
  convertEmail(
    "Convert interest - Memory",
    "convert_memory",
    "{{firstName}}, memory and focus while you sleep",
    `Hello {{firstName}},

Sleep supports memory consolidation. Reach For The Stars reinforces learning, recall, and mental clarity with goal-based audios scheduled each night - no playlist to maintain.

Read the memory goal page:
{{siteUrl}}/memory

And the memory-improvement wellness page:
{{siteUrl}}/memory-improvement`
  ),
  convertEmail(
    "Convert interest - Inspiration",
    "convert_inspiration",
    "{{firstName}}, inspiration on a nightly schedule",
    `Hello {{firstName}},

Inspiration at will for creative and entrepreneurial work. Guided audios reinforce openness, motivation, and follow-through before sleep clears mental clutter - so daytime flow is not competing with another course.

Pair inspiration with wealth or spirituality if that is your mix.

Read the inspiration page:
{{siteUrl}}/inspiration`
  ),
  convertEmail(
    "Convert interest - Spirituality",
    "convert_spirituality",
    "{{firstName}}, a sacred routine that happens at bedtime",
    `Hello {{firstName}},

A greater connection with your spirituality does not have to be one more daytime appointment. Bedtime becomes a consistent spiritual practice: peace, presence, and inner alignment, reinforced as you fall asleep and during sleep.

You choose goals that match your path. The schedule adapts when you update them.

Read the spirituality page:
{{siteUrl}}/spirituality`
  ),
  convertEmail(
    "Convert interest - Overcoming Addiction",
    "convert_overcoming_addiction",
    "{{firstName}}, habit change that primes the next day",
    `Hello {{firstName}},

Overcoming addiction and unwanted habits starts with consistent mindset reinforcement. Supportive messages at bedtime and during sleep help prime next-day choices - calm, control, and balanced living instead of automatic patterns.

This is a complement to medical care and recovery support, not a replacement.

Read the overcoming addiction page:
{{siteUrl}}/overcoming-addiction

Related: will power {{siteUrl}}/will-power, balanced life {{siteUrl}}/balanced-life`
  ),
  convertEmail(
    "Convert interest - Balanced Life",
    "convert_balanced_life",
    "{{firstName}}, highest potential across all of life - including financial",
    `Hello {{firstName}},

Reach your highest potential physically, mentally, emotionally, spiritually, and financially. Balanced Life is the whole-life frame: not one habit at a time, but a nightly rotation across the areas you rank highest.

Pick up to ten priorities. Reorder anytime. Press Start Session.

Read the balanced life page:
{{siteUrl}}/balanced-life`
  ),
  convertEmail(
    "Convert interest - Sleep",
    "convert_sleep",
    "{{firstName}}, guided sleep meditation that actually has a schedule",
    `Hello {{firstName}},

If you have searched for guided sleep meditation or how to sleep better, this is the low-friction version: short intro relaxation music, then your first goal recording as you wind down. Optional second audio during restorative sleep.

Your schedule rotates rest, calm, and related goals so it stays fresh - not one track on repeat.

Read the sleep page:
{{siteUrl}}/sleep-meditation`
  ),
  convertEmail(
    "Convert interest - Stress relief",
    "convert_stress",
    "{{firstName}}, calm at the one window you already have",
    `Hello {{firstName}},

The transition into sleep is a natural window for relaxation. Stress-relief meditation at night reinforces calm, focus, and emotional balance without adding a daytime task you will skip when you are already overloaded.

Members often use techniques from sessions to settle themselves during the day.

Read the stress relief page:
{{siteUrl}}/stress-relief`
  ),
  convertEmail(
    "Convert interest - Burnout recovery",
    "convert_burnout",
    "{{firstName}}, burnout recovery that does not require 6 a.m. willpower",
    `Hello {{firstName}},

Burnout drains the energy required for daytime meditation. Nightly guided audios meet you when the day is already over. Press Start Session. Recovery is not competing with work or family.

Rotate calm, rest, and balanced-life goals. Stay consistent for weeks. Cumulative nights beat one intensive self-care weekend.

Read the burnout recovery page:
{{siteUrl}}/burnout-recovery`
  ),
  convertEmail(
    "Convert interest - Pain relief",
    "convert_pain",
    "{{firstName}}, mind-body support for comfort and sleep",
    `Hello {{firstName}},

Guided relaxation can ease muscle tension and the stress that amplifies pain - especially at bedtime. Better sleep also supports recovery. Use this alongside medical care, not instead of it.

Facilitators can add personalized recordings (CGMR) when you need extra customization.

Read the pain relief page:
{{siteUrl}}/pain-relief`
  ),
  convertEmail(
    "Convert interest - Blood pressure",
    "convert_blood_pressure",
    "{{firstName}}, cardiovascular calm as a nightly habit",
    `Hello {{firstName}},

Regular meditation is linked with lower blood pressure and reduced cardiovascular stress. A fixed bedtime practice removes the friction of choosing what to listen to - consistency is what matters.

Pair calm and health goals. Track progress with your doctor.

Read the blood pressure page:
{{siteUrl}}/blood-pressure-regulation`
  ),
  convertEmail(
    "Convert interest - Resilience",
    "convert_resilience",
    "{{firstName}}, bounce back after hard days - while you sleep",
    `Hello {{firstName}},

Physical and psychological resilience is the capacity to recover from life's demands. Nightly goal-based messages at bedtime and during sleep support that recovery - especially for caregivers and high-stress work.

Hard days need recovery, not another daytime chore.

Read the resilience page:
{{siteUrl}}/resilience-meditation`
  ),
  convertEmail(
    "Convert interest - Emotional health",
    "convert_emotional_health",
    "{{firstName}}, mood and regulation trained at bedtime",
    `Hello {{firstName}},

Improved emotional health is one of the most cited benefits of meditation. Repeated guided messages train attention and emotional responses - skills you can use during the day.

Choose calm, confidence, balance, or inspiration so the audios match what you want to feel more of.

Read the emotional health page:
{{siteUrl}}/emotional-health`
  ),
  convertEmail(
    "Convert interest - Will power",
    "convert_will_power",
    "{{firstName}}, discipline that primes tomorrow's choices",
    `Hello {{firstName}},

Enhanced will power supports habit change - from follow-through at work to healthier routines. Hearing intention-focused audios as you fall asleep primes the subconscious for next-day choices.

Goals rotate so discipline themes are reinforced regularly, not as one-off sessions.

Read the will power page:
{{siteUrl}}/will-power`
  ),
  convertEmail(
    "Convert interest - Self-awareness",
    "convert_self_awareness",
    "{{firstName}}, insight without another daytime journal assignment",
    `Hello {{firstName}},

Greater self-awareness helps you notice patterns, triggers, and goals more clearly. Guided meditation at night trains focused attention - a foundation for seeing thoughts and habits without judgment.

Bedtime is already a pause. We give that pause structured content aligned with your priorities.

Read the self-awareness page:
{{siteUrl}}/self-awareness`
  )
];

export const MEMBER_CONVERSION_EMAIL_TEMPLATES: ConversionEmailTemplate[] = [
  ...MEMBER_CONVERT_NURTURE_EMAILS,
  MEMBER_CONVERT_ALL_INTERESTS_EMAIL,
  ...MEMBER_CONVERT_INTEREST_EMAILS,
  ...MEMBER_LEAD_CARD_CONVERSION_EMAILS
];
